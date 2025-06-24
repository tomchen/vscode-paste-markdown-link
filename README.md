# Paste Markdown Link <img width="32" src="icon.png">

A simple VS Code extension that helps you create formatted Markdown links quickly. When you have text selected and paste a URL, it automatically formats it as a Markdown link `[TEXT] (URL)`.

## Usage

1. Select some text in a Markdown file <sup>[1]</sup>
2. Copy a URL link (e.g., `https://www.example.com` <sup>[2]</sup>) to your clipboard
3. Press <kbd>Ctrl</kbd> + <kbd>V</kbd> (Windows, Linux) or <kbd>Cmd</kbd> + <kbd>V</kbd> (macOS)
4. The selected text will be converted into a Markdown link `[TEXT] (URL)` with the URL

## Advanced Usage

Three commands are available:

1. **Paste Markdown Link (Ctrl+V)**: The basic command described above. It checks if the clipboard text is a URL with known protocols <sup>[2]</sup> and pastes it as a Markdown link `[TEXT] (URL)`. Default keybinding: <kbd>Ctrl</kbd> + <kbd>V</kbd> (Windows, Linux) or <kbd>Cmd</kbd> + <kbd>V</kbd> (macOS)
2. **Paste Markdown Link**: Same as above, but is "forced", meaning it does not check if the clipboard text is a URL, and pastes the markdown syntax no matter what is selected.<sup>[3]</sup> Typically used to paste relative links like `[TEXT] (/path/to/file)`. No default keybinding.
3. **Paste Markdown Image**: Same as above ("forced" (no clipboard URL check and no selection check)), but pastes an image link `![TEXT] (URL)`. No default keybinding.

Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to open the command palette, then search for these commands and press Enter.

## Notes

- [1]: Markdown, MDX, R Markdown, and Quarto files are supported
- [2]: Typically `http(s)` links, but also supports: _ftp(s), file, sftp, ssh, scp, mailto, tel, sms, callto, magnet, torrent, ed2k, thunder, dchub, dcpp, irc, ircs, news, nntp, git, svn, hg, data, blob, ipfs, ipns, chrome, chrome-extension, about, resource, moz-extension, ws, wss, vscode, cursor_
- [3]: If one selection is within an existing Markdown link or image, or one selection spans multiple lines, the "Ctrl+V" command will replace the selection with the clipboard text as-is without adding Markdown link syntax, but the other two commands will add the Markdown link syntax (newlines will be replaced with spaces)
- When no text is selected, two non "Ctrl+V" commands create a markdown link with empty brackets with cursor inside
- All three commands support multi-selection. Each selection is processed independently, as if it were a single selection
- Compatible with VS Code 1.75.0 or higher and its derivatives like Cursor
- This extension is not needed if you're using [Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one), which already includes this feature. Paste Markdown Link is intended as a lightweight alternative for users who don't need the additional functionality provided by Markdown All in One
- No user settings are available
- No runtime (bundled, non-dev) dependencies. It's minimalistic yet includes comprehensive tests and a CI build pipeline targeting both the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=tomchen.paste-markdown-link) and the [Open VSX Registry](https://open-vsx.org/extension/tomchen/paste-markdown-link). It can serve as a template for other extensions
- MIT License

## Release Notes

### 1.0.2

- Initial release

### 1.0.3

- Add support for multi-selection
- If a selection is inside an existing Markdown link/image or spans multiple lines, the clipboard text is pasted as-is without Markdown syntax

### 1.0.4

- When no text is selected, the two non "Ctrl+V" commands create a markdown link with empty brackets with cursor inside

### 1.0.5

- Change command names
- If a selection is inside an existing Markdown link/image or spans multiple lines: the two non "Ctrl+V" commands will add the Markdown link syntax (newlines will be replaced with spaces)
- Fix multi-selection (in document order and not) cursor placement issue
