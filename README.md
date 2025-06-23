# Paste Markdown Link <img width="32" src="icon.png">

A simple VS Code extension that helps you create formatted Markdown links quickly. When you have text selected and paste a URL, it automatically formats it as a Markdown link (`[text](url)`).

## Usage

1. Select some text in a Markdown file <sup>[1]</sup>
2. Copy a URL link (e.g., `https://www.example.com` <sup>[2]</sup>) to your clipboard
3. Press <kbd>Ctrl + V</kbd> (Windows, Linux) or <kbd>Cmd + V</kbd> (macOS)
4. The selected text will be converted into a Markdown link (`[Text](URL)`) with the URL

## Advanced Usage

Three commands are available:

- **Paste Markdown Link**: The basic command described above. It checks if the clipboard text is a URL with known protocols <sup>[2]</sup> and pastes it as a Markdown link (`[Text](URL)`). Default keybinding: <kbd>Ctrl + V</kbd> (Windows, Linux) or <kbd>Cmd + V</kbd> (macOS)
- **Paste Markdown Link (No URL Check)**: Same as above, but does not validate the clipboard text. Typically used to paste relative links like `[Text](/path/to/file)`. No default keybinding.
- **Paste Markdown Image**: Same as above (no validation), but pastes an image link (`![Text](URL)`). No default keybinding.

Press <kbd>Ctrl + Shift + P</kbd> to open the command palette, then search for these commands and press Enter.

## Notes

- [1]: Markdown, MDX, R Markdown, and Quarto files are supported
- [2]: Typically `http(s)` links, but also supports: _ftp(s), file, sftp, ssh, scp, mailto, tel, sms, callto, magnet, torrent, ed2k, thunder, dchub, dcpp, irc, ircs, news, nntp, git, svn, hg, data, blob, ipfs, ipns, chrome, chrome-extension, about, resource, moz-extension, ws, wss, vscode, cursor_
- Compatible with VS Code 1.75.0 or higher and its derivatives like Cursor
- This extension is not needed if you're using [Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one), which already includes this feature. Paste Markdown Link is intended as a lightweight alternative for users who don't need the additional functionality provided by Markdown All in One.
- No user settings are available
- No runtime (bundled, non-dev) dependencies. It's minimalistic but includes comprehensive tests. Can be used as a template for other extensions.
- MIT License

## Release Notes

### 1.0.0

Initial release
