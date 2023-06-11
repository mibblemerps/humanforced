import md5 from 'md5';

export default class Profile {
    constructor() {
        /**
         * Employee number/code.
         *
         * @type {string}
         */
        this.employeeCode = undefined;

        /**
         * Employee GUID
         *
         * @type {string}
         */
        this.guid = undefined;

        /**
         * Employee first name (may include other given names also).
         *
         * @type {string}
         */
        this.firstName = undefined;

        /**
         * Employee last name.
         *
         * @type {string}
         */
        this.lastName = undefined;
    }

    /**
     * First name and last name concatenated.
     *
     * @return {string}
     */
    get fullName() {
        return this.firstName + (this.lastName ? ' '  + this.lastName : '');
    }

    get hash() {
        return md5(JSON.stringify(this));
    }
}