import axios from 'axios';
import * as fs from 'fs';
import Shift from './shift.js';
import Payslip from './payslip.js';
import Profile from './profile.js';

const userAgent = 'Dalvik/2.1.0 (Linux; U; Android 12; Build/SE1A.220826.005)';

/**
 * Humanforce client instance.
 */
export default class Humanforce {
    constructor() {
        /**
         * @type {null|{
         *     companies: [{}]
         * }}
         */
        this.session = null;

        /**
         * URL to access Humanforce central server.
         * This is used for authentication. Further requests are directed to an endpoint that is returned by the central
         * server upon successful authentication.
         *
         * @type {string}
         */
        this.humanForcePrefix = 'https://api.humanforce.com';

        /**
         * Timezone offset in minutes.
         *
         * @type {number}
         */
        this.timezoneOffset = new Date().getTimezoneOffset();

        this.defaultSessionFile = 'session.json';

        this._cachedProfile = null;

        this._axios = axios.create({
            headers: {
                'User-Agent': userAgent
            },
            timeout: 5000,
        });

        this._axios.interceptors.request.use((config) => {
            config.baseURL = this.session.companies[0].endpointUrl;
            config.headers['sessiontoken'] = this.sessionToken;
            config.headers['timezoneoffset'] = this.timezoneOffset;
            return config;
        });
    }

    get sessionToken() {
        return this.session.companies[0].sessionToken;
    }

    get companyName() {
        return this.session.companies[0].name;
    }

    get isLoggedIn() {
        return !!this.session;
    }

    /**
     * Login into Humanforce.
     *
     * @param {string} email Email address
     * @param {string} password Password
     * @param {boolean} rememberMe Try to login using saved session, otherwise login as usual then save the session for next time.
     * @return {Promise<void>}
     */
    async login(email, password, rememberMe = false) {
        if (rememberMe) {
            try {
                if (await this.loadSession()) return;
            } catch (err) {}
        }

        const requestBody = JSON.stringify({
            email: email,
            password: password,
            deviceId: '489e1269adc779af',
            deviceToken: 'dSs4kEn4Tp6a1JOFNjeUl5:APA91bF_WBtrUXOx-EkLQMJv9j0HnBVyLUZjugeDBRjVOiCT5Y4yrAfBQGiDMcZ2c2yUojrQMkXDSuL4hYSCinev7sKoclr0TcLdjfeMOq8TmQOPEMz6_AF6zIjh9-y2g1tSAkCyjE1S',
            isDevelopment: false,
            TimezoneOffset: this.timezoneOffset
        });

        const response = await axios.post(this.humanForcePrefix + '/v3/user/login/', requestBody, {
            responseType: 'json',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/json',
            },
            timeout: 5000
        });

        this.session = response.data;

        if (rememberMe) {
            await this.saveSession();
        }
    }

    /**
     * Get calendar of shifts.
     *
     * The default from/to values are consistent with what the mobile application does.
     *
     * @param {Date|null} from Start date (if null, the first day of 2 months ago is assumed)
     * @param {Date|null} to End date (if null, the last day of 2 months ahead is assumed)
     * @param filterNonShifts
     * @return {Promise<Shift[]>}
     */
    async getCalendar(from = null, to = null, filterNonShifts = true) {
        this._throwIfNotLoggedIn();

        const today = new Date();
        from = from ?? new Date(today.getFullYear(), today.getMonth() - 2, 1);
        to = to ?? new Date(today.getFullYear(), today.getMonth() + 2 + 1, 0); // add extra month so date 0 will give the last day of the previous month

        const requestBody = JSON.stringify({
            DateFrom: from,
            DateTo: to
        });
        const response = await this._axios.post('/Calendar/GetCalendarByDateRange', requestBody, {
            responseType: 'json',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        let shifts = [];
        for (const entry of response.data) {
            const shift = new Shift();
            shift.guid = entry['GuidKey'];
            shift.shiftType = entry['ShiftType'];
            shift.status = entry['Status'];
            shift.startTime = new Date(entry['DateTimeStart']);
            shift.endTime = new Date(entry['DateTimeEnd']);
            const ldr = entry['LDR'];
            if (ldr) {
                shift.location = ldr['Location'];
                shift.department = ldr['Department'];
                shift.role = ldr['Role'];
            }

            if (filterNonShifts && shift.status !== 7) continue;

            shifts.push(shift);
        }
        return shifts;
    }

    /**
     * Get all payslips.
     *
     * @return {Promise<Payslip[]>}
     */
    async getPayslips() {
        this._throwIfNotLoggedIn();

        let from = new Date();
        from.setFullYear(from.getFullYear() - 10); // 10 years ago
        let to = new Date();

        const fromStr = encodeURIComponent(from.toISOString().replace(/:[\d.]+Z$/, ''));
        const toStr = encodeURIComponent(to.toISOString().replace(/:[\d.]+Z$/, ''));

        let payslips = [];
        let skip = 0;
        for (let i = 0; i < 50; i++) { // (page limit)
            const response = await this._axios.get(`/Payslips?startDate=${fromStr}&endDate=${toStr}&take=20&skip=${skip}`);

            for (const entry of response.data) {
                const payslip = new Payslip();
                payslip.guid = entry['PayslipGuidKey'];
                payslip.startDate = new Date(entry['DTPStart']);
                payslip.endDate = new Date(entry['DTPEnd']);
                payslip.downloadLink = this.session.companies[0].endpointUrl + '/Payslips/' + payslip.guid;
                payslip.download = () => this.downloadPayslip(payslip);
                payslips.push(payslip);
            }

            if (response.data.length < 20) {
                // Less than 20 results - this is the last page
                break;
            }

            skip += 20;
        }

        return payslips;
    }

    /**
     * Possibly not working correctly.
     *
     * @param {Payslip} payslip
     * @return {Promise<Blob>}
     */
    async downloadPayslip(payslip) {
        this._throwIfNotLoggedIn();

        return (await this._axios.get(payslip.downloadLink, {responseType: 'blob'})).data;
    }

    /**
     * Get user profile.
     *
     * @param {boolean} useCached Use a cached version if available
     * @return {Promise<Profile>}
     */
    async getProfile(useCached = true) {
        if (useCached && this._cachedProfile) return this._cachedProfile;

        const requestBody = JSON.stringify({
            TimezoneOffset: this.timezoneOffset
        });

        const response = await this._axios.post('/account/GetProfile', requestBody, {
            responseType: 'json',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const profile = new Profile();
        profile.guid = response.data['GuidKey'];
        profile.employeeCode = response.data['EmployeeCode'];
        profile.firstName = response.data['FirstName'];
        profile.lastName = response.data['LastName'];
        this._cachedProfile = profile;
        return profile;
    }

    async saveSession(path = null) {
        this._throwIfNotLoggedIn();

        path = path ?? this.defaultSessionFile;
        await fs.promises.writeFile(path, JSON.stringify(this.session));
    }

    async loadSession(path = null, testSession = true) {
        path = path ?? this.defaultSessionFile;
        this.session = JSON.parse(await fs.promises.readFile(path, 'utf-8'));

        if (testSession && !(await this.testSession())) {
            // Session not working
            this.session = null;
            return false;
        }

        return true;
    }

    /**
     * Test that the current session is valid.
     *
     * @return {Promise<boolean>} True if session is valid.
     */
    async testSession() {
        const response = await this._axios.get('Common/UserSettings', {
            validateStatus: null
        });

        // Any 400 error (client error) is treated as something wrong with our session or authentication.
        return !(response.status >= 400 && response.status < 500);
    }

    /**
     * @private
     */
    _throwIfNotLoggedIn() {
        if (!this.isLoggedIn) throw new Error('Not logged in! Call login() first.');
    }
}

export class InvalidSessionError extends Error {
    constructor() {
        super('Session invalid or expired. Please login again.');
    }
}
