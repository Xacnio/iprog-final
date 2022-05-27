function checkValue(vObj, key, value) {
    if (typeof value !== typeof vObj[key]) return false;
    if (vObj[key] == value) return true;
    return false;
}

function handleExpr(vObj, obj) {
    for (let [key, value] of Object.entries(obj)) {
        if (['$or', '$and'].includes(key)) {
            if (key === '$and' && typeof value === 'object') {
                if (!handleAnd(vObj, value)) return false;
            } else if (key === '$or' && typeof value === 'object') {
                if (!handleOr(vObj, value)) return false;
            }
        } else {
            if (!handleOpr(vObj, key, value)) return false;
        }
    }
    return true;
}

function handleOpr(vObj, key, value) {
    if (typeof value !== 'object') {
        if (checkValue(vObj, key, value)) return true;
        return false;
    }

    for (let [k, v] of Object.entries(value)) {
        switch (key) {
            case '$gte':
                if (vObj[k] >= v) return true;
                break;
            case '$gt':
                if (vObj[k] > v) return true;
                break;
            case '$lte':
                if (vObj[k] <= v) return true;
                break;
            case '$lt':
                if (vObj[k] < v) return true;
                break;
        }
    }
    return false;
}

function handleOr(vObj, array) {
    for (let obj of array) {
        for (let [key, value] of Object.entries(obj)) {
            if (['$or', '$and'].includes(key)) {
                if (key === '$and' && typeof value === 'object') {
                    if (handleAnd(vObj, value)) return true;
                } else if (key === '$or' && typeof value === 'object') {
                    if (handleOr(vObj, value)) return true;
                }
            } else {
                if (handleOpr(vObj, key, value)) return true;
            }
        }
    }
    return false;
}

function handleAnd(vObj, array) {
    for (let obj of array) {
        for (let [key, value] of Object.entries(obj)) {
            if (['$or', '$and'].includes(key)) {
                if (key === '$and' && typeof value === 'object') {
                    if (!handleAnd(vObj, value)) return false;
                } else if (key === '$or' && typeof value === 'object') {
                    if (!handleOr(vObj, value)) return false;
                }
            } else {
                if (!handleOpr(vObj, key, value)) return false;
            }
        }
    }
    return true;
}

module.exports = handleExpr;