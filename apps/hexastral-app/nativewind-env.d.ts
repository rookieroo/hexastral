/// <reference types="nativewind/types" />

// lunar-javascript has no official @types package — declare a minimal shim
declare module 'lunar-javascript' {
  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    static fromDate(date: Date): Lunar
    getSolar(): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getYearInGanZhi(): string
    getMonthInGanZhi(): string
    getDayInGanZhi(): string
  }
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    toDate(): Date
  }
  export class LunarYear {
    static fromYear(year: number): LunarYear
    getLeapMonth(): number
  }
}
