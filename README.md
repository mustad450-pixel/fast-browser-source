# Fast Browser v1.2.2 Source

Fast Browser is a Chromium-based personal browser.

## Release

- Fast Browser: v1.2.2
- Chromium: 155.0.8059.12
- Chromium base: 384c82079f60e0b79cdca6e49efd5cfceefa5b74
- Fast Browser source commit: 9d0c015f6a7a993111d32731858dc5add11d76c9
- Custom commits: 13
- Changed files: 67

## Contents

- patches/fast-browser-v1.2.2.patch
  Complete Fast Browser patch against Chromium 155.0.8059.12.

- modified-files/
  Final versions of the Chromium files modified by Fast Browser.

- CHANGED-FILES.txt
  Complete changed-file list.

- COMMITS.txt
  Fast Browser customization commit history.

- CHROMIUM-BASE.txt
  Exact Chromium upstream base information.

## Reproducing the source

Obtain Chromium 155.0.8059.12 and checkout:

    git checkout 155.0.8059.12

Then apply:

    git apply --binary patches/fast-browser-v1.2.2.patch

The patch includes the complete Fast Browser customization set from the
specified Chromium base through Fast Browser v1.2.2.

Chromium source and third-party components remain subject to their
respective upstream licenses.