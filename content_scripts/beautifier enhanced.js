console.log('Beautifier loaded');

function syntaxHighlight(content, format) {
   if (format === 'yaml') {
       return content.split('\n').map(line => {
           // If line starts with quotes and contains a color property
           if (line.match(/^\s*-?\s*"color:/)) {
               return line;
           }
           
           // If line starts with quotes and content
           if (line.match(/^\s*-?\s*"content:/)) {
               return line;
           }

           // Handle lines that start with role:
           if (line.match(/^\s*role:/)) {
               return line.replace(
                   /(role):/,
                   '<span style="color: #0066cc;">$1</span>:'
               );
           }

           // Handle other standard YAML lines
           return line.replace(
               /^(\s*-?\s*)([\w-]+):/g,
               '$1<span style="color: #0066cc;">$2</span>:'
           );
       }).join('\n');
   } else {
       // JSON syntax highlighting remains the same
       return content.replace(
           /"([^"]+)":/g, 
           '<span style="color: #0066cc; font-weight: bold;">"$1"</span>:'
       ).replace(
            /: "((?:\\.|[^"\\])*)"/g,
            (_, str) => {
            try {
                const decoded = JSON.parse(`"${str}"`);
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
    ).replace(
           /: (true|false|null|\d+)/g,
           ': <span style="color: #aa0000;">$1</span>'
       );
   }
}

function detectFormat(filename, content) {
   if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
       return 'yaml';
   }
   if (filename.endsWith('.jsonl')) {
       return 'jsonl';
   }
   // Try parsing as JSON
   try {
       JSON.parse(content);
       return 'json';
   } catch (e) {
       // If not JSON, and filename ends with .json, might be JSONL
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
   console.log('Format content called');
   const pre = document.querySelector('pre');
   if (!pre) {
       console.log('No pre element found');
       return;
   }

   try {
       const content = pre.textContent;
       const filename = window.location.pathname;
       const format = detectFormat(filename, content);
       console.log('Detected format:', format);

       // Create main container
       const container = document.createElement('div');
       container.style.padding = '20px';
       container.style.backgroundColor = '#f5f5f5';
       container.style.fontFamily = 'Consolas, Monaco, monospace';
       container.style.fontSize = '14px';
       container.style.lineHeight = '1.5';
       container.style.position = 'relative';

       // Add format indicator
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

       // Add copy button
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
       copyButton.addEventListener('mouseover', () => {
           copyButton.style.backgroundColor = '#0052a3';
       });
       copyButton.addEventListener('mouseout', () => {
           copyButton.style.backgroundColor = '#0066cc';
       });
       copyButton.onclick = async () => {
           try {
               await navigator.clipboard.writeText(content);
               copyButton.textContent = 'Copied!';
               setTimeout(() => {
                   copyButton.textContent = 'Copy';
               }, 1500);
           } catch (err) {
               console.error('Failed to copy:', err);
           }
       };
       container.appendChild(copyButton);

       // Create wrapper for content and line numbers
       const wrapper = document.createElement('div');
       wrapper.style.display = 'flex';
       wrapper.style.flexDirection = 'row';

       // Create line numbers container
       const lineNumbers = document.createElement('div');
       lineNumbers.style.color = '#666';
       lineNumbers.style.userSelect = 'none';
       lineNumbers.style.paddingRight = '20px';
       lineNumbers.style.textAlign = 'right';
       lineNumbers.style.minWidth = '40px';
       
       if (format === 'yaml') {
           // For YAML, just highlight without reformatting
           const contentDiv = document.createElement('div');
           contentDiv.style.whiteSpace = 'pre-wrap';
           contentDiv.style.wordBreak = 'break-word';
           contentDiv.style.flexGrow = '1';
           
           const lines = content.split('\n');
           lines.forEach((_, i) => {
               lineNumbers.innerHTML += `${i + 1}<br>`;
           });
           
           contentDiv.innerHTML = syntaxHighlight(content, 'yaml');
           
           wrapper.appendChild(lineNumbers);
           wrapper.appendChild(contentDiv);
           container.appendChild(wrapper);
       } else {
           // Split and format each line for JSON/JSONL
           const lines = content.split('\n');
           console.log('Split into', lines.length, 'lines');

           lines.forEach((line, index) => {
               if (line.trim()) {
                   try {
                       const parsed = JSON.parse(line);
                       const formatted = JSON.stringify(parsed, null, 2);
                       
                       const lineContainer = document.createElement('div');
                       lineContainer.style.marginBottom = '20px';
                       lineContainer.style.position = 'relative';
                       
                       // Add line number
                       const lineNumber = document.createElement('div');
                       lineNumber.style.position = 'absolute';
                       lineNumber.style.left = '-50px';
                       lineNumber.style.color = '#666';
                       lineNumber.style.userSelect = 'none';
                       lineNumber.textContent = (index + 1).toString();
                       lineContainer.appendChild(lineNumber);

                       // Add formatted content with syntax highlighting
                       const contentDiv = document.createElement('div');
                       contentDiv.style.whiteSpace = 'pre-wrap';
                       contentDiv.style.paddingLeft = '20px';
                       contentDiv.style.wordBreak = 'break-word';
                       contentDiv.style.maxWidth = 'calc(100vw - 120px)';
                       contentDiv.innerHTML = syntaxHighlight(formatted, 'json');
                       lineContainer.appendChild(contentDiv);
                       
                       container.appendChild(lineContainer);
                   } catch (e) {
                       console.log(`Error parsing line ${index + 1}:`, e);
                   }
               }
           });
       }

       // Add padding for line numbers
       container.style.paddingLeft = '60px';

       // Replace the pre element with our formatted container
       pre.parentNode.replaceChild(container, pre);
       console.log('Formatting complete');

   } catch (e) {
       console.error('Formatting error:', e);
   }
}

// Run immediately and on load
formatContent();
window.addEventListener('load', formatContent);