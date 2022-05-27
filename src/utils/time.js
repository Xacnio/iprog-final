const moment = require('moment');

function jDateObj(jDate, lang) {
    const lng = (lang !== undefined && lang.length > 0) ? lang : "en";
    const date = moment.utc(jDate);
    return {
        date,
        htmlForm: date.locale(lng).format().slice(0, 16),
        showForm: date.locale(lng).format('DD MMM YYYY HH:mm'),
    }
}

function dateObj(date, lang) {
    const lng = (lang !== undefined && lang.length > 0) ? lang : "en";
    return {
        date,
        htmlForm: date.locale(lng).format().slice(0, 16),
        showForm: date.locale(lng).format('DD MMM YYYY HH:mm'),
    }
}

function minStartDate(lang) {
    const date = moment.utc().subtract(1, 'days'); // before 1 day
    return dateObj(date, lang);
}

function maxStartDate(lang) {
    const date = moment.utc().add(10, 'days'); // after 10 days
    return dateObj(date, lang);
}

function minEndDate(lang) {
    const date = moment.utc().add(7, 'days'); // after 7 days
    return dateObj(date, lang);
}

function maxEndDate(lang) {
    const date = moment.utc().add(6, 'months'); // after 6 months
    return dateObj(date, lang);
}

function getChallengeValidStartEndDates(lang) {
    return {
        start: {
            min: minStartDate(lang),
            max: maxStartDate(lang),
        },
        end: {
            min: minEndDate(lang),
            max: maxEndDate(lang),
        }
    };
}

function checkChallengeDate(start, end, lang) {
    if (!moment(start).isBefore(moment(end))) return 'ERR_STARTEND';
    if (!moment(start).isAfter(minStartDate(lang).date)) return 'ERR_MIN_START';
    if (!moment(start).isBefore(maxStartDate(lang).date)) return 'ERR_MAX_START';
    if (!moment(end).isAfter(minEndDate(lang).date)) return 'ERR_MIN_END';
    if (!moment(end).isBefore(maxEndDate(lang).date)) return 'ERR_MAX_END';
    return null;
}

module.exports = {
    getChallengeValidStartEndDates,
    checkChallengeDate,
    jDateObj,
}