export default class Shift {
    constructor() {
        /**
         * @type {string}
         */
        this.guid = undefined;

        /**
         * Shift start date/time
         *
         * @type {Date}
         */
        this.startTime = undefined;

        /**
         * Shift end date/time
         *
         * @type {Date}
         */
        this.endTime = undefined;

        /**
         * Location. Eg. "ADELAIDE TABLET"
         *
         * @type {string}
         */
        this.location = undefined;

        /**
         * Role. Eg. "AIR SERVICES DRIVER MR OR HR"
         *
         * @type {string}
         */
        this.role = undefined;

        /**
         * Department. Eg. "PM SHIFT"
         *
         * @type {string}
         */
        this.department = undefined;

        /**
         * Shift type. Normally "Normal". If it's a public holiday, this will be the name of the public holiday, in all caps.
         * Eg. "QUEEN'S BIRTHDAY", "EASTER SATURDAY"
         *
         * @type {string}
         */
        this.shiftType = undefined;

        /**
         * Purpose unknown.
         *
         * @type {number}
         */
        this.status = undefined;
    }
}
