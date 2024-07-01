document.addEventListener('DOMContentLoaded', initializePopup);

var oaText = '<a class="pretiusHiddenLink" href="https://apex.oracle.com/" target="_blank">Oracle APEX</a>'
var bwlText = `<h3>Built with ❤️ using ${oaText}</h3>`;

function initializePopup() {
    const contentDiv = document.getElementById('content');
    chrome.tabs.query({ active: true, currentWindow: true }, handleTabsQuery);

    function handleTabsQuery(tabs) {
        if (tabs && tabs.length > 0) {
            let tabId = tabs[0].id;
            chrome.runtime.sendMessage({ type: "GET_PAYLOAD", tabId: tabId }, handleResponse);
        } else {
            console.log("Failed to get active tab information");
        }
    }

    function handleResponse(response) {

        if (response && response.payload && response.payload.isApex == true) {
            let apexEnv = response.payload.apexEnv; // Parse JSON string to object
            if (Object.keys(apexEnv).length > 0) {
                const tableHTML = generateTableHTML(apexEnv);
                const footerHTML = generateFooterHTML();

                contentDiv.innerHTML = `<div class="popup-content-body">
                                        ${bwlText}
                                        ${tableHTML}
                                    </div>
                                    ${footerHTML}`;
            }
            else {
                contentDiv.innerHTML = `<div class="popup-content-body">${bwlText}</div>`;
            }
        } else {

            const messages = [
                `No love for ${oaText} here 💔`,
                `Heartbroken without ${oaText} 💔`,
                `${oaText} is missing, and so is the love 💔`,
                `No ${oaText}, just heartache 💔`,
                `Feeling the void of ${oaText} 💔`,
                `${oaText} not found, only heartbreak 💔`,
                `Lost without ${oaText} 💔`,
                `${oaText} skipped, hearts broken 💔`,
                `No ${oaText}, no love 💔`,
                `Unbelievable, no ${oaText} 💔`,
                `Without ${oaText}, it's just 💔`,
                `No ${oaText}, son's crying now, cheers 💔`
            ];            
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            contentDiv.innerHTML = `<div class="popup-content-body"><h3>${randomMessage}</h3></div>`;
        }
    }

    function generateTableHTML(apexEnv) {
        let tableHTML = '<table class="blue-theme">';
        tableHTML += '<tr><th>Attribute</th><th>Value</th></tr>';

        for (let key in apexEnv) {
            tableHTML += `<tr><td>${key}</td><td>${apexEnv[key]}</td></tr>`;
        }

        tableHTML += '</table>';
        return tableHTML;
    }

    function generateFooterHTML() {
        return `<div class="pretiusRevealerFooter">
                    <a class="pretiusRevealerLink pretiusFooterOptions" href="https://pretius.com/main/" target="_blank">Pretius</a>
                    <a class="pretiusRevealerLink" href="https://twitter.com/Matt_Mulvaney" target="_blank">@Matt_Mulvaney</a>
                    <a class="pretiusRevealerLink" href="https://twitter.com/PretiusSoftware" target="_blank">@PretiusSoftware</a>
                    <div class="pretiusTablockVersion"></div>
                </div>`;
    }
}
