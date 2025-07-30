
console.log('Beautifier loaded');

let interpretEscapes = localStorage.getItem('interpretEscapes') === 'false' ? false : true;
let isFormatting = false;

function syntaxHighlight(content, format) {
    if (format === 'yaml') {
        return content.split('\n').map(line => {
            if (line.match(/^\s*-?\s*"color:/)) return line;
            if (line.match(/^\s*-?\s*"content:/)) return line;
            if (line.match(/^\s*role:/)) {
                return line.replace(
                    /(role):/,
                    '<span style="color: #0066cc;">$1</span>:'
                );
            }
            return line.replace(
                /^(\s*-?\s*)([\w-]+):/g,
                '$1<span style="color: #0066cc;">$2</span>:'
            );
        }).join('\n');
    } else {
        return content
            .replace(
                /"([^"]+)":/g,
                '<span style="color: #0066cc; font-weight: bold;">"$1"</span>:'
            )
            .replace(
                /: "((?:\\.|[^"\\])*)"/g,
                (_, str) => {
                    try {
                        const decoded = interpretEscapes ? JSON.parse(`"${str}"`) : str;
                        const htmlEscaped = decoded
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/\n/g, '<br>')
                            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
                        return `: <span style="color: #008000;">"${htmlEscaped}"</span>`;
                    } catch {
                        return `: <span style="color: #008000;">"${str}"</span>`;
                    }
                }
            )
            .replace(
                /: (true|false|null|\d+)/g,
                ': <span style="color: #aa0000;">$1</span>'
            );
    }
}

function detectFormat(filename, content) {
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'yaml';
    if (filename.endsWith('.jsonl')) return 'jsonl';
    try {
        JSON.parse(content);
        return 'json';
    } catch {
        if (filename.endsWith('.json')) {
            const lines = content.trim().split('\n');
            const isJsonl = lines.every(line => {
                try {
                    JSON.parse(line.trim());
                    return true;
                } catch {
                    return false;
                }
            });
            if (isJsonl) return 'jsonl';
        }
    }
    return 'unknown';
}

function formatContent() {
    if (isFormatting) return;
    isFormatting = true;

    const pre = document.querySelector('pre');
    if (!pre) return;

    const content = pre.textContent;
    const filename = window.location.pathname;
    const format = detectFormat(filename, content);

    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.backgroundColor = '#f5f5f5';
    container.style.fontFamily = 'Consolas, Monaco, monospace';
    container.style.fontSize = '14px';
    container.style.lineHeight = '1.5';
    container.style.position = 'relative';
    container.style.paddingLeft = '60px';

    const formatIndicator = document.createElement('div');
    formatIndicator.style.position = 'fixed';
    formatIndicator.style.top = '20px';
    formatIndicator.style.left = '20px';
    formatIndicator.style.padding = '8px 16px';
    formatIndicator.style.backgroundColor = '#666';
    formatIndicator.style.color = 'white';
    formatIndicator.style.borderRadius = '4px';
    formatIndicator.textContent = format.toUpperCase();
    container.appendChild(formatIndicator);

    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy';
    copyButton.style.position = 'fixed';
    copyButton.style.top = '20px';
    copyButton.style.right = '20px';
    copyButton.style.padding = '8px 16px';
    copyButton.style.backgroundColor = '#0066cc';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    copyButton.onclick = async () => {
        try {
            await navigator.clipboard.writeText(content);
            copyButton.textContent = 'Copied!';
            setTimeout(() => { copyButton.textContent = 'Copy'; }, 1500);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };
    container.appendChild(copyButton);

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';

    const lineNumbers = document.createElement('div');
    lineNumbers.style.color = '#666';
    lineNumbers.style.userSelect = 'none';
    lineNumbers.style.paddingRight = '20px';
    lineNumbers.style.textAlign = 'right';
    lineNumbers.style.minWidth = '40px';

    if (format === 'yaml') {
        const contentDiv = document.createElement('div');
        contentDiv.style.whiteSpace = 'pre-wrap';
        contentDiv.style.wordBreak = 'break-word';
        contentDiv.style.flexGrow = '1';

        const lines = content.split('\n');
        lines.forEach((_, i) => { lineNumbers.innerHTML += `${i + 1}<br>`; });
        contentDiv.innerHTML = syntaxHighlight(content, 'yaml');
        wrapper.appendChild(lineNumbers);
        wrapper.appendChild(contentDiv);
        container.appendChild(wrapper);
    } else {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.trim()) {
                try {
                    const parsed = JSON.parse(line);
                    const formatted = JSON.stringify(parsed, null, 2);

                    const lineContainer = document.createElement('div');
                    lineContainer.style.marginBottom = '20px';
                    lineContainer.style.position = 'relative';

                    const lineNumber = document.createElement('div');
                    lineNumber.style.position = 'absolute';
                    lineNumber.style.left = '-50px';
                    lineNumber.style.color = '#666';
                    lineNumber.style.userSelect = 'none';
                    lineNumber.textContent = (index + 1).toString();
                    lineContainer.appendChild(lineNumber);

                    const contentDiv = document.createElement('div');
                    contentDiv.style.whiteSpace = 'pre-wrap';
                    contentDiv.style.paddingLeft = '20px';
                    contentDiv.style.wordBreak = 'break-word';
                    contentDiv.style.maxWidth = 'calc(100vw - 120px)';
                    contentDiv.innerHTML = syntaxHighlight(formatted, 'json');
                    lineContainer.appendChild(contentDiv);
                    container.appendChild(lineContainer);
                } catch (e) {
                    console.log(`Line ${index + 1} error:`, e);
                }
            }
        });
    }

    pre.parentNode.replaceChild(container, pre);
    isFormatting = false;
}

function addToggleButton() {
    const target = document.body || document.documentElement;
    if (!document.getElementById('toggle-escapes-btn')) {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggle-escapes-btn';
        toggleButton.textContent = interpretEscapes ? 'Show Raw \\n' : 'Show Interpreted';
        toggleButton.style.position = 'fixed';
        toggleButton.style.top = '60px';
        toggleButton.style.right = '20px';
        toggleButton.style.padding = '8px 16px';
        toggleButton.style.backgroundColor = '#999';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '4px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.zIndex = 10000;
        toggleButton.addEventListener('click', () => {
            interpretEscapes = !interpretEscapes;
            localStorage.setItem('interpretEscapes', interpretEscapes);
            location.reload();
        });
        target.appendChild(toggleButton);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        addToggleButton();
        formatContent();
    });
} else {
    addToggleButton();
    formatContent();
}
