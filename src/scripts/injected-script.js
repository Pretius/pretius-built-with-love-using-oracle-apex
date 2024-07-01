function checkApex() {
    const isApex = (typeof (window.apex && window.apex.jQuery) === 'function');
    let apexEnv = {};
    let bwl;
    let tabId = document.body.getAttribute('tmp_bwl_tabid');
    document.body.removeAttribute('tmp_bwl_tabid')

    if (isApex && typeof (window.apex.env) === 'object') {
        apexEnv = window.apex.env;
    }    

    bwl = JSON.stringify({ isApex: isApex, tabId: tabId, apexEnv: apexEnv });
    document.body.setAttribute('tmp_bwl', bwl);

    // window.postMessage({ type: 'BUILT_WITH_LOVE_FROM_PAGE', isApex: isApex }, '*');
    window.postMessage({ type: 'BUILT_WITH_LOVE_FROM_PAGE' }, '*');
}

// Immediately run the function when the script is loaded
checkApex();
