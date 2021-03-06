var fetchToUrl = '/wp-json/dx-crm/v1/add-lead';
var loginUrl = '/wp-json/jwt-auth/v1/token';
var listMaximum = '3';
var debounceMilliseconds = 100;

$(function () {
    accessThroughCookieUsage()
        .then((response) => {
            if (response) { mainLogic(); }
            if (!response) { setLoginForm(); }
        });
});

function accessThroughCookieUsage() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(null, function (user) {
            if (user.details) { resolve(true); }
            resolve(false);
        });
    });
}

function mainLogic() {
    createLeadsForm();
    handlePopupForms('fields');
    let $company = $('#company');
    let $email = $('#email');
    let $name = $('#name');
    let $notes = $('#notes');

    chrome.storage.sync.get(['collection', 'saveFields'], function (leads) {
        setFormFields(leads);
        buildLeadsListWithActions(leads.collection);
        addButton();
        clearButton();
        editButton();
        cancelButton();
        logoutButton();
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (Object.keys(changes)[0] === 'collection') {
            const allLeads = changes.collection.newValue;
            allLeads.length !== 0 ?
                chrome.browserAction.setBadgeText({ 'text': allLeads.length.toString() })
                :
                chrome.browserAction.setBadgeText({ 'text': '' });
        }
    });

    function addButton() {
        $('.btn-add').click(function () {
            chrome.storage.sync.get(['collection'], function (leads) {
                let newCollection = collectionValidation(leads.collection);
                let popupForm = {};

                if ($company.val()) {
                    popupForm = {
                        id: Math.random().toString().substr(2, 8),
                        date: getTimeOfAdding(),
                        company: $company.val() ? $company.val() : 'Company name is required',
                        email: $email.val() ? $email.val() : '',
                        name: $name.val() ? $name.val() : '',
                        notes: $notes.val() ? $notes.val() : '',
                    };

                    newCollection.push(popupForm);
                }

                if (Object.keys(popupForm).length === 0 && popupForm.constructor === Object) {
                    chrome.notifications.create('errorAdding', {
                        type: 'basic',
                        iconUrl: '../assets/images/48.png',
                        title: 'Error with adding!',
                        message: 'Company name is required.'
                    });
                    return;
                }

                chrome.storage.sync.set({ 'collection': newCollection }, function () {
                    chrome.notifications.create('successfullyAdded', {
                        type: 'basic',
                        iconUrl: '../assets/images/48.png',
                        title: 'Successfully Added!',
                        message: 'You have added lead information in your temporary list.'
                    });

                    buildLeadsListWithActions(newCollection);
                });

                clearFormFields();
            });
        });
    }

    function clearButton() {
        $('.btn-clear').click(function () {
            clearFormFields();
        });
    }

    function editButton() {
        $('.btn-edit').click(function () {
            chrome.storage.sync.get(['selectedId', 'collection'], function (leads) {
                let newCollection = collectionValidation(leads.collection);

                const popupForm = {
                    id: leads.selectedId,
                    date: getTimeOfAdding(),
                    company: $company.val() ? $company.val() : 'Company name is required',
                    email: $email.val() ? $email.val() : '',
                    name: $name.val() ? $name.val() : '',
                    notes: $notes.val() ? $notes.val() : '',
                };

                let newData = [];
                for (const iterator of newCollection) {
                    if (iterator.id === leads.selectedId) {
                        newData.push(popupForm);
                    } else {
                        newData.push(iterator);
                    }
                }

                chrome.storage.sync.set({ 'collection': newData }, function () {
                    handleCancellation();
                });
            });
        });
    }

    function cancelButton() {
        $('.btn-cancel').click(function () {
            handleCancellation();
        });
    }

    function logoutButton() {
        $('.btn-logout').click(function () {
            chrome.storage.sync.remove(['details'], function () {
                chrome.notifications.create('successfullyLogout', {
                    type: 'basic',
                    iconUrl: '../assets/images/48.png',
                    title: 'Successfully Logout!',
                    message: 'You have logout successfully.'
                });

                $('.popup-list, .popup-form').empty();
                $('.popup-list, .popup-form').removeAttr('style');
                setLoginForm();
            });
        });
    }

    function selectLeadForEditing() {
        $('.lead-card').click(function (event) {

            $('.btn-add').hide();
            $('.btn-edit').show();
            $('.btn-clear').hide();
            $('.btn-cancel').show();

            const currentId = event.currentTarget.id;
            chrome.storage.sync.set({ 'selectedId': currentId });

            chrome.storage.sync.get(['collection'], function (leads) {
                const newCollection = collectionValidation(leads.collection);
                let selectedLead = {};

                for (const iterator of newCollection) {
                    if (iterator.id === currentId) {
                        selectedLead = iterator;
                    }
                }

                $company.val(selectedLead.company);
                $email.val(selectedLead.email);
                $name.val(selectedLead.name);
                $notes.val(selectedLead.notes);
            });
        });
    }

    function collectionValidation(arr) {
        let shallowCopy = [];
        if (Array.isArray(arr) && arr.length) { shallowCopy = [...arr]; }
        return shallowCopy;
    }

    function buildLeadsListWithActions(arr) {
        $('.popup-list').html(createLeadsList(arr));
        confirmButton();
        removeButton();
        selectLeadForEditing();
    }

    function createLeadsList(arr) {
        if (Array.isArray(arr) && arr.length) {
            (arr.length > Number(listMaximum)) ?
                $('.popup-list').css({ 'height': '20em', 'overflow': 'auto' })
                :
                $('.popup-list').css({ 'height': 'auto', 'overflow': 'none' });

            const leadCard = 'lead-card';
            return arr.reduce((acc, cur, index) => acc += `
            <div id="${cur.id}" class="${leadCard} position-${index}">
                <section class="${leadCard}-header">
                    <div class="${leadCard}-company">${cur.company}</div>
                    <div class="${leadCard}-header-actions">
                        <button class="btn-confirm">Confirm</button>
                        <button class="btn-remove">Remove</button>
                        <div class="${leadCard}-time"><span>${cur.date}</span></div>
                    </div>
                </section>
                <section class="${leadCard}-main">
                    <div class="${leadCard}-name">${cur.name}</div>
                    <a class="${leadCard}-email" href="${cur.email}">${cur.email}</a>
                </section>
                <section class="${leadCard}-footer">
                    <div class="${leadCard}-notes">${cur.notes}</div>
                </section>
            </div>
        `, '');
        }
        return '<div>Empty List...</div>';
    }

    function confirmButton() {
        $('.btn-confirm').click(function (event) {
            const currentId = event.currentTarget.parentElement.parentElement.parentElement.id;

            chrome.storage.sync.get(['collection', 'siteDomain'], function (leads) {
                let siteDomain = '';
                let confirmElement = {};
                if (leads.siteDomain) {
                    siteDomain = leads.siteDomain;
                } else {
                    confirmElement.error = 'Your domain is incorrect, login again';
                }

                let newCollection = collectionValidation(leads.collection);

                newCollection = newCollection.filter((element) => {
                    if (element.company === 'Company name is required') {
                        confirmElement.error = 'Your company name is not valid';
                        return;
                    }

                    if (element.id === currentId) {
                        (isEmail(element.email) || element.email === '') ?
                            confirmElement = element
                            :
                            confirmElement.error = 'Your email address is not valid';
                        return;
                    }

                    return element;
                });

                if (confirmElement.hasOwnProperty('error')) {
                    handleIncorrectData(confirmElement);
                    return;
                }

                delete confirmElement.id;
                delete confirmElement.data;
                chrome.storage.sync.get(['details'], function (user) {
                    fetch(siteDomain + fetchToUrl, {
                        method: 'POST',
                        body: JSON.stringify(confirmElement),
                        headers: {
                            'Authorization': `Bearer ${user.details.token}`,
                            'Content-Type': 'application/json'
                        },
                    })
                        .then(response => response.json())
                        .then((data) => {
                            if (data.message !== 'success') {
                                handleIncorrectData({ error: 'Your domain is incorrect, login again.' });
                                return;
                            }

                            chrome.storage.sync.set({ "collection": newCollection }, function () {
                                chrome.notifications.create('successfullySaved', {
                                    type: 'basic',
                                    iconUrl: '../assets/images/48.png',
                                    title: 'Successfully Saved Credentials!',
                                    message: 'Credentials are saved on the site!'
                                });

                                buildLeadsListWithActions(newCollection);
                                handleCancellation();
                            });
                        });
                });
            });
        });

        const $leadCardError = $('.lead-card-error');
        function handleIncorrectData(onj) {
            const relativeTop = $('.DevriX_SalesCRM_SaaS').height() - 50;
            $leadCardError.css({ top: relativeTop });
            $leadCardError.text(onj.error);

            const toggleError = setInterval(function () {
                $leadCardError.text('');
                clearInterval(toggleError);
            }, 3000);
        }

        function isEmail(email) {
            var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(email);
        }
    }

    function removeButton() {
        $('.btn-remove').click(function (event) {
            const currentId = event.currentTarget.parentElement.parentElement.parentElement.id;

            chrome.storage.sync.get(['collection'], function (leads) {
                let newCollection = collectionValidation(leads.collection);
                newCollection = newCollection.filter((element) => element.id !== currentId);

                chrome.storage.sync.set({ "collection": newCollection }, function () {
                    chrome.notifications.create('successfullyRemoved', {
                        type: 'basic',
                        iconUrl: '../assets/images/48.png',
                        title: 'Successfully Removed!',
                        message: 'Credentials removed from temporary list.'
                    });

                    buildLeadsListWithActions(newCollection);
                    handleCancellation();
                });
            });
        });
    }

    function handleCancellation() {
        $('.btn-add').show();
        $('.btn-edit').hide();
        $('.btn-clear').show();
        $('.btn-cancel').hide();

        chrome.storage.sync.get(['collection', 'saveFields'], function (form) {
            setFormFields(form);
            buildLeadsListWithActions(form.collection);
        });
    }

    function createLeadsForm() {
        const customField = 'custom-field';
        const fieldsActionsButtons = 'fields-actions-buttons';
        $('.popup-form').html(`
            <section class="fields-holder">
                <input type="text" id="company" class="${customField}" name="company" placeholder="Company name *">
                <input type="email" id="email" class="${customField}" name="email" placeholder="Email address">
                <input type="text" id="name" class="${customField}" name="name" placeholder="Name">
                <input type="text" id="notes" class="${customField}" name="notes" placeholder="Notes">
            </section>

            <section class="lead-card-error"></section>

            <section class="fields-actions">
                <button class="btn-add ${fieldsActionsButtons}" >Add</button>
                <button class="btn-edit ${fieldsActionsButtons} hidden">Edit</button>
                <button class="btn-clear ${fieldsActionsButtons}">Clear</button>
                <button class="btn-cancel ${fieldsActionsButtons} hidden">Cancel</button>
                <button class="btn-logout ${fieldsActionsButtons}">Logout</button>
            </section>
        `);
    }

    function setFormFields(element) {
        if (element.saveFields && Object.keys(element.saveFields).length) {
            $company.val(element.saveFields.company);
            $email.val(element.saveFields.email);
            $name.val(element.saveFields.name);
            $notes.val(element.saveFields.notes);
        } else {
            $company.val('');
            $email.val('');
            $name.val('');
            $notes.val('');
        }
    }

    function clearFormFields() {
        chrome.storage.sync.set({ 'fields': {} });
        chrome.storage.sync.set({ 'saveFields': {} });
        $company.val('');
        $email.val('');
        $name.val('');
        $notes.val('');
    }

    function getTimeOfAdding() {
        const currentTime = new Date();
        const abbreviatedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        return `${currentTime.getDate()} ${abbreviatedMonths[currentTime.getMonth()]}`;
    }
}

function setLoginForm() {
    $(document).unbind();
    chrome.storage.sync.set({ 'loginFields': {}, });
    chrome.storage.sync.set({ 'siteDomain': {}, });
    unauthorizedUser();
    handlePopupForms('loginFields');
    loginButton();
    pressEnterToLogin();

    function unauthorizedUser() {
        const customField = 'custom-field';
        $('.popup-login').html(`
        <h1 class="login-header">Login</h1>
        <div class="login-form">
            <section class="login-fields-holder">
                <input type="text" id="site-domain" class="${customField} domain" name="siteDomain" placeholder="Enter site domain">
                <input type="text" id="username" class="${customField}" name="username" placeholder="Enter username">
                <input type="password" id="password" class="${customField}" name="password" placeholder="Enter password">
            </section>

            <section class="login-fields-error"></section>
            
            <section class="fields-actions">
                <button class="btn-login fields-actions-buttons">Login</button>
            </section>
        </div>
        `);
    }

    function loginButton() {
        $('.btn-login').click(function () {
            handleLogin();
        });
    }

    function pressEnterToLogin() {
        $(document).on('keypress', function (e) {
            if (e.which === 13) {
                handleLogin();
            }
        });
    }

    function handleLogin() {
        chrome.storage.sync.get(['loginFields'], function (form) {
            let confirmElement = {};

            if (form.loginFields.siteDomain === '') {
                confirmElement.error = 'Site domain is empty';
            } else {
                confirmElement.siteDomain = trimInputSiteDomain(form.loginFields.siteDomain);
            }

            if (confirmElement.hasOwnProperty('error')) {
                handleIncorrectData(confirmElement);
                return;
            }

            fetch(confirmElement.siteDomain + loginUrl, {
                method: 'POST',
                body: JSON.stringify({ username: form.loginFields.username, password: form.loginFields.password }),
                headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then(response => response.json())
                .then((data) => {
                    if (!data.token) {
                        switch (data.code) {
                            case '[jwt_auth] invalid_username':
                                handleIncorrectData({ error: 'Unknown username.' });
                                break;
                            case '[jwt_auth] incorrect_password':
                                handleIncorrectData({ error: 'Invalid password.' });
                                break;
                            default:
                                break;
                        }
                        return;
                    }

                    chrome.storage.sync.set({ 'details': data }, function () {
                        chrome.notifications.create('successfullyLogin', {
                            type: 'basic',
                            iconUrl: '../assets/images/48.png',
                            title: 'Successfully Login!',
                            message: 'You have login successfully.'
                        });
                    });

                    chrome.storage.sync.set({ 'loginFields': {}, });
                    chrome.storage.sync.set({ 'siteDomain': confirmElement.siteDomain, });
                    $('.popup-login').empty();
                    mainLogic();
                });
        });

        const $loginFieldsError = $('.login-fields-error');
        function handleIncorrectData(obj) {


            $loginFieldsError.text(obj.error);

            const toggleError = setInterval(function () {
                $loginFieldsError.text = '';
                clearInterval(toggleError);
            }, 3000);
        }

        function trimInputSiteDomain(url) {
            if (url) {
                return 'http://' + url.replace('http://', '').replace('https://', '').replace(/\//g, '').replace(/\"/g, '');
            }
        }
    }
}

function handlePopupForms(formSelection) {
    $('.custom-field').keyup(
        delay(function (event) {
            let currentFieldChange = {};
            if (event) { currentFieldChange[event.currentTarget.name] = event.currentTarget.value; }

            let newFormFields = new Promise((resolve) => {
                chrome.storage.sync.get([formSelection], function (form) {
                    switch (formSelection) {
                        case 'loginFields':
                            (!form[formSelection] || Object.keys(form[formSelection]).length === 0) ?
                                resolve({ username: '', password: '', siteDomain: '' })
                                :
                                resolve(form[formSelection]);
                            break;
                        case 'fields':
                            (!form.loginFields || Object.keys(form.loginFields).length === 0) ?
                                resolve({ username: '', password: '', })
                                :
                                resolve(form.loginFields);
                            break;
                        default:
                            break;
                    }
                });
            });

            newFormFields
                .then((fields) => {
                    if (Object.keys(currentFieldChange).length) {
                        return ({ ...fields, ...currentFieldChange });
                    }
                    return fields;
                })
                .then((readyFields) => {
                    chrome.storage.sync.set({ [formSelection]: readyFields });
                });
        }, debounceMilliseconds)
    );

    function delay(callback, ms) {
        var timer = 0;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                callback.apply(context, args);
            }, ms || 0);
        };
    }
}