interface WeekDay {
    index: number,
    day: string
}
const day = "MM月DD日";
const time = "HH:mm";
const week: Array<WeekDay> = [{
    index: 1,
    day: "一"
}, {
    index: 2,
    day: "二"
}, {
    index: 3,
    day: "三"
}, {
    index: 4,
    day: "四"
}, {
    index: 5,
    day: "五"
}, {
    index: 6,
    day: "六"
}, {
    index: 7,
    day: "日"
}
];
export {
    week,
    day,
    time,
}
