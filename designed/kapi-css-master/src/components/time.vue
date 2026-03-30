<template>
    <div class="app-date-box">
      <p class="app-time">{{ propDate.hm }}</p>
      <p class="app-date">{{ propDate.day }} 星期{{ propDate.week }} {{ propDate.chineseCalendar }}</p>
    </div>
</template>

<script lang='ts' setup>
    
    interface TimeDate{
        chineseCalendar?:string,
        week?:string,
        day?:string,
        hm?:string,
    }
    const props = defineProps<{
        propDate:TimeDate
    }>();

    let {propDate} = props;

</script>

<style scoped lang="scss">
    .app-date-box {
        user-select: none;
        box-sizing: border-box;
        width: 200px;
        height: 100px;
        padding-top: 20px;
        text-align: center;
        color: rgba(255, 254, 249, .7);
        .app-time {
            line-height: 45px;
            font-size: 45px;
        }
        .app-date {
            font-size: 14px;
            line-height: 26px;
            font-weight: 800;
        }
    }
</style>


