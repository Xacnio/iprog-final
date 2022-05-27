function nameToURLKey(name) {
    return name.replace(/Ğ/gm, "g")
        .replace(/Ü/gm, "u")
        .replace(/Ş/gm, "s")
        .replace(/I/gm, "i")
        .replace(/İ/gm, "i")
        .replace(/Ö/gm, "o")
        .replace(/Ç/gm, "c")
        .replace(/ğ/gm, "g")
        .replace(/ü/gm, "u")
        .replace(/ş/gm, "s")
        .replace(/ı/gm, "i")
        .replace(/ö/gm, "o")
        .replace(/ç/gm, "c")
        .replace(/ \/ /gm, "-")
        .replace(/ & /gm, "-")
        .replace(/ _ /gm, "-")
        .replace(/ - /gm, "-")
        .replace(/ /gm, "-")
        .toLowerCase()
        .replace(/[^0-9a-zA-Z-_]+/gm, "");
}

module.exports = {
    nameToURLKey,
}