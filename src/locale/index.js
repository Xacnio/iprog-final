const DEFAULT = require('./en');

module.exports.LANGLIST = (req) => {
    const lngURL = function () {
        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        let url = new URL(fullUrl);
        url.searchParams.set('lang', this.code);
        return url.toString();
    }
    return {
        'en': { code: "en", name: "English", eName: 'English', url: lngURL },
        'tr': { code: "tr", name: "Türkçe", eName: 'Turkish', url: lngURL },
    }
}

var LANGS = {
    'en': DEFAULT,
    'tr': DefaultCheck(require('./tr')),
};

module.exports.formatLocale = function (str) {
    var args = arguments;
    return str.replace(/\$([0-9]+)/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
};

module.exports.getLocale = (lang) => {
    if (!lang || lang.length === 0) return DEFAULT;

    if (typeof LANGS[lang] === 'object') {
        return LANGS[lang];
    }
    return DEFAULT;
}

// If not exist some strings in other languages from default, copy strings from default language
function DefaultCheck(obj) {
    DefaultObject(DEFAULT, obj);
    return obj;
}

// Recursive Function
function DefaultObject(obj, localeObj) {
    if (typeof obj === "object" && typeof localeObj === "object") {
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === "object") {
                if (typeof localeObj[key] === "undefined") {
                    localeObj[key] = obj[key];
                } else {
                    DefaultObject(obj[key], localeObj[key]);
                }
            } else {
                if (typeof localeObj[key] === "undefined") localeObj[key] = obj[key];
            }
        })
    }
}