// var siteUrl = 'http://dxqaplayground.salescrm.local/';
var fetchToUrl = '/wp-json/dx-crm/v1/add-lead';
var loginUrl = '/wp-json/jwt-auth/v1/token';
var listMaximum = '3';

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
    handleExtensionForm();
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

                if ($company.val() &&
                    $email.val() &&
                    $name.val() &&
                    $notes.val()
                ) {
                    const popupForm = {
                        id: Math.random().toString().substr(2, 8),
                        date: getTimeOfAdding(),
                        company: $company.val() ? $company.val() : 'empty company value!',
                        email: $email.val() ? $email.val() : 'empty email value!',
                        name: $name.val() ? $name.val() : 'empty name value!',
                        notes: $notes.val() ? $notes.val() : 'empty notes value!',
                    };

                    newCollection.push(popupForm);
                }

                chrome.storage.sync.set({ 'collection': newCollection }, function () {
                    let notificationOptions = {
                        type: 'basic',
                        iconUrl: './assets/images/48.png',
                        title: 'Successfully Added!',
                        message: 'You have added lead information in your temporary list.'
                    };

                    chrome.notifications.create('successfullyAdded', notificationOptions);
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
                    company: $company.val() ? $company.val() : 'empty company value!',
                    email: $email.val() ? $email.val() : 'empty email value!',
                    name: $name.val() ? $name.val() : 'empty name value!',
                    notes: $notes.val() ? $notes.val() : 'empty notes value!',
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
                    let notificationOptions = {
                        type: 'basic',
                        iconUrl: './assets/images/48.png',
                        title: 'Successfully Edited!',
                        message: 'You have edited lead information in your temporary list.'
                    };

                    chrome.notifications.create('successfullyAdded', notificationOptions);
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
                let notificationOptions = {
                    type: 'basic',
                    iconUrl: './assets/images/48.png',
                    title: 'Successfully Logout!',
                    message: 'You have logout.'
                };

                chrome.notifications.create('successfullyLogout', notificationOptions);
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
                const siteDomain = leads.siteDomain;
                chrome.extension.getBackgroundPage().console.log(siteDomain);
                let newCollection = collectionValidation(leads.collection);
                let confirmElement = {};
                newCollection = newCollection.filter((element) => {
                    if (element.id === currentId) {
                        isEmail(element.email) ?
                            confirmElement = element
                            :
                            confirmElement.error = 'Your email address is not valid';
                    } else {
                        return element;
                    }
                });

                if (confirmElement.hasOwnProperty('error')) {
                    handleIncorrectEmail(currentId, confirmElement);
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
                                chrome.extension.getBackgroundPage().console.error(data.message);
                                return;
                            }
                            chrome.storage.sync.set({ "collection": newCollection }, function () {
                                let notificationOptions = {
                                    type: 'basic',
                                    iconUrl: './assets/images/48.png',
                                    title: 'Successfully Confirmed!',
                                    message: 'Credentials are saved on the site!'
                                };

                                chrome.notifications.create('successfullyConfirmed', notificationOptions);
                                buildLeadsListWithActions(newCollection);
                                handleCancellation();
                            });
                        })
                        .catch((err) => {
                            chrome.extension.getBackgroundPage().console.error(err);
                        });
                });
            });
        });

        function handleIncorrectEmail(currentId, onj) {
            $(`#${currentId}.lead-card`).append(`<section class="lead-card-error"><div>${onj.error}</div></section>`);

            const toggleError = setInterval(function () {
                $(`#${currentId}.lead-card .lead-card-error`).remove();
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
                    let notificationOptions = {
                        type: 'basic',
                        iconUrl: './assets/images/48.png',
                        title: 'Successfully Removed!',
                        message: 'Credentials removed from temporary list.'
                    };

                    chrome.notifications.create('successfullyRemoved', notificationOptions);
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
                <input type="text" id="company" class="${customField}" name="company" placeholder="Company name ...">
                <input type="email" id="email" class="${customField}" name="email" placeholder="Email address">
                <input type="text" id="name" class="${customField}" name="name" placeholder="Name">
                <input type="text" id="notes" class="${customField}" name="notes" placeholder="Notes">
            </section>

            <section class="fields-actions">
                <button class="btn-add ${fieldsActionsButtons}" >Add</button>
                <button class="btn-edit ${fieldsActionsButtons} hidden">Edit</button>
                <button class="btn-clear ${fieldsActionsButtons}">Clear</button>
                <button class="btn-cancel ${fieldsActionsButtons} hidden">Cancel</button>
                <button class="btn-logout ${fieldsActionsButtons}">Logout</button>
            </section>
        `);
    }

    function handleExtensionForm() {
        $('.custom-field').keyup(
            delay(function (event) {
                let currentFieldChange = {};
                if (event) { currentFieldChange[event.currentTarget.id] = event.currentTarget.value; }

                let newFormFields = new Promise((resolve) => {
                    chrome.storage.sync.get(['fields'], function (from) {
                        (!from.fields || Object.keys(from.fields).length === 0) ?
                            resolve({ company: '', email: '', name: '', notes: '', })
                            :
                            resolve(from.fields);
                    });
                });

                newFormFields.then((fields) => {
                    if (Object.keys(currentFieldChange).length) {
                        return ({ ...fields, ...currentFieldChange });
                    }
                    return fields;
                }).then((readyFields) => {
                    chrome.storage.sync.set({ 'fields': readyFields });
                });
            }, 200)
        );
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
    unauthorizedUser();
    loginButton();
    handleLoginForm();
}

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

            <section class="fields-actions">
                <button class="btn-login fields-actions-buttons">Login</button>
            </section>
        </div>
    `);
}

function loginButton() {
    $('.btn-login').click(function () {
        chrome.storage.sync.get(['loginFields'], function (form) {
            const siteDomain = trimInputSiteDomain(form.loginFields.siteDomain);

            fetch(siteDomain + loginUrl, {
                method: 'POST',
                body: JSON.stringify({ username: form.loginFields.username, password: form.loginFields.password }),
                headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then(response => response.json())
                .then((data) => {
                    if (!data.token) { return; }

                    chrome.storage.sync.set({ 'details': data }, function () {
                        let notificationOptions = {
                            type: 'basic',
                            iconUrl: './assets/images/48.png',
                            title: 'Successfully Login!',
                            message: 'You have login.'
                        };

                        chrome.notifications.create('successfullyLogin', notificationOptions);
                    });
                    chrome.storage.sync.set({ 'loginFields': {}, });
                    chrome.storage.sync.set({ 'siteDomain': siteDomain, });
                    $('.popup-login').empty();
                    mainLogic();
                })
                .catch((err) => {
                    chrome.extension.getBackgroundPage().console.error(err);
                });
        });

        function trimInputSiteDomain(url) {
            return 'http://' + url.replace('http://', '').replace('https://', '').replace(/\//g, '').replace(/\"/g, '');
        }
    });
}

function handleLoginForm() {
    $('.custom-field').keyup(
        delay(function (event) {
            let currentFieldChange = {};
            if (event) { currentFieldChange[event.currentTarget.name] = event.currentTarget.value; }

            let newFormFields = new Promise((resolve) => {
                chrome.storage.sync.get(['loginFields'], function (from) {
                    (!from.loginFields || Object.keys(from.loginFields).length === 0) ?
                        resolve({ username: '', password: '', })
                        :
                        resolve(from.loginFields);
                });
            });

            newFormFields.then((fields) => {
                if (Object.keys(currentFieldChange).length) {
                    return ({ ...fields, ...currentFieldChange });
                }
                return fields;
            }).then((readyFields) => {
                chrome.storage.sync.set({ 'loginFields': readyFields });
            });
        }, 100)
    );
}

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