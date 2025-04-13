# Paste Markdown Link <img width="32" src="icon.svg">

A lightweight VS Code extension that helps you create formatted Markdown links quickly. When you have text selected and paste a URL, it automatically formats it as a markdown link (`[]()`).

## Usage

1. Select some text in a markdown file <sup>[1]</sup>
2. Copy a URL link (e.g. `https://www.example.com` <sup>[2]</sup>) to your clipboard
3. Press <kbd>Ctrl + V</kbd> (Windows, Linux) or <kbd>Cmd + V</kbd> (macOS)
4. The selected text will be converted into a markdown link (`[Text](URL)`) with the URL

## Advanced Usage

There are three commands available:

- **Paste Markdown Link**: basic command described above, checks if the clipboard text is a URL with known protocols <sup>[2]</sup> and pastes it as a markdown link (`[Text](URL)`), default keybinding is <kbd>Ctrl + V</kbd> (Windows, Linux) or <kbd>Cmd + V</kbd> (macOS)
- **Paste Markdown Link (No URL Check)**: same as above, but does not check the clipboard text, typically used to paste relative links like `[Text](/path/to/file)`, no default keybinding
- **Paste Markdown Image**: same as above (does not check), but pastes an image link (`![Text](URL)`), no default keybinding

<kbd>Ctrl + Shift + P</kbd> to open the command palette, then search for those commands and press enter.

## Notes

- [1]: Markdown, MDX, R Markdown, and Quarto are supported
- [2]: Typically `http(s)` links, but can also be: _ftp(s), file, sftp, ssh, scp, mailto, tel, sms, callto, magnet, torrent, ed2k, thunder, dchub, dcpp, irc, ircs, news, nntp, git, svn, hg, data, blob, ipfs, ipns, chrome, chrome-extension, about, resource, moz-extension, ws, wss, vscode, cursor_
- Compatible with VS Code 1.75.0 or higher or its derivative like Cursor
- This extension is not needed if you are using [Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one) extension, as the latter already has this feature
- This extension does not have any settings
- MIT License

## Release Notes

### 1.0.0

Initial release
