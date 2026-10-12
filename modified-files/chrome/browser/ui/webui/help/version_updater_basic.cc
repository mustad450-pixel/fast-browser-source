// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <memory>
#include <string>

#include <utility>
#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/functional/bind.h"
#include "base/location.h"
#include "base/process/launch.h"
#include "base/task/task_traits.h"
#include "base/task/thread_pool.h"

#include "chrome/browser/ui/webui/help/version_updater.h"
#include "chrome/browser/upgrade_detector/upgrade_detector.h"

namespace {

constexpr wchar_t kFastBrowserSecurityTaskName[] =
    L"Fast Browser Security AutoBuild";

bool StartFastBrowserSecurityTask() {
  base::CommandLine command(
      base::FilePath(L"C:\\Windows\\System32\\schtasks.exe"));
  command.AppendArgNative(L"/Run");
  command.AppendArgNative(L"/TN");
  command.AppendArgNative(kFastBrowserSecurityTaskName);

  base::LaunchOptions options;
  options.start_hidden = true;
  base::Process process = base::LaunchProcess(command, options);
  if (!process.IsValid()) {
    return false;
  }

  int exit_code = -1;
  return process.WaitForExit(&exit_code) && exit_code == 0;
}

void ReportFastBrowserSecurityTaskResult(
    VersionUpdater::StatusCallback callback,
    bool started) {
  const std::u16string message =
      started
          ? u"Security update check started. Automatic Chromium security checks also run every 6 hours."
          : u"Fast Krozer could not start the automatic security update task.";
  callback.Run(started ? VersionUpdater::UPDATED : VersionUpdater::FAILED,
               0, false, false, std::string(), 0, message);
}

// Bare bones implementation just checks if a new version is ready.
class VersionUpdaterBasic : public VersionUpdater {
 public:
  VersionUpdaterBasic(const VersionUpdaterBasic&) = delete;
  VersionUpdaterBasic& operator=(const VersionUpdaterBasic&) = delete;
  VersionUpdaterBasic() = default;
  ~VersionUpdaterBasic() override = default;

  // VersionUpdater implementation.
void CheckForUpdate(StatusCallback callback, PromoteCallback) override {
  callback.Run(CHECKING, 0, false, false, std::string(), 0,
               std::u16string());

  base::ThreadPool::PostTaskAndReplyWithResult(
      FROM_HERE, {base::MayBlock(), base::TaskPriority::USER_VISIBLE},
      base::BindOnce(&StartFastBrowserSecurityTask),
      base::BindOnce(&ReportFastBrowserSecurityTaskResult,
                     std::move(callback)));
}
};

}  // namespace

std::unique_ptr<VersionUpdater> VersionUpdater::Create(
    content::WebContents* web_contents) {
  return std::make_unique<VersionUpdaterBasic>();
}
