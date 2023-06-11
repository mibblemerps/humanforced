export default class Payslip {
    constructor() {
        /**
         * @type {string}
         */
        this.guid = undefined;

        /**
         * Start date of this pay period.
         *
         * @type {Date}
         */
        this.startDate = undefined;

        /**
         * End date of this pay period.
         *
         * @type {Date}
         */
        this.endDate = undefined;

        /**
         * @type {string}
         */
        this.downloadLink = undefined;

        /**
         * @type {function : Promise<Blob>}
         */
        this.download = undefined;
    }
}