var url = 'http://salescrm.local/';
var name = 'wordpress_logged_in_bd33638523a252d14e880fd261e82d2f';

$(function () {
    accessThroughCookieUsage(url, name)
        .then((response) => {
            if (response) { mainLogic(); }
            if (!response) { unauthorizedUser(); }
        });
});

function accessThroughCookieUsage(url, name) {
    return new Promise((resolve) => {
        chrome.cookies.getAll({ 'url': url, 'name': name }, function (cookie) {
            if (Array.isArray(cookie) && cookie.length) { resolve(true); }
            resolve(false);
        });
    });
}

function mainLogic() {
    createLeadsForm();
    setLeadsFormActions();
    let $company = $('#company');
    let $email = $('#email');
    let $name = $('#name');
    let $notes = $('#notes');

    chrome.storage.sync.get(['collection', 'fields'], function (leads) {
        setLeadsListActions(leads.collection);

        if (Object.keys(leads.fields).length) {
            $company.val(leads.fields.company);
            $email.val(leads.fields.email);
            $name.val(leads.fields.name);
            $notes.val(leads.fields.notes);
        }
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (Object.keys(changes)[0] === 'collection') {
            const allLeads = changes.collection.newValue;
            allLeads.length !== 0 ?
                chrome.browserAction.setBadgeText({ 'text': allLeads.length.toString() })
                :
                chrome.browserAction.setBadgeText({ 'text': null });
        }
    });

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
                setLeadsListActions(newCollection);
            });

            clearFields();
        });
    });

    $('.btn-clear').click(function () {
        clearFields();
    });

    function collectionValidation(arr) {
        let shallowCopy = [];
        if (Array.isArray(arr) && arr.length) { shallowCopy = [...arr]; }
        return shallowCopy;
    }

    function setLeadsListActions(arr) {
        $('.popup-list').html(createLeadsList(arr));
        confirmButton();
        removeButton();
    }

    function createLeadsList(arr) {
        let leadCard = 'lead-card';
        if (Array.isArray(arr) && arr.length) {
            return arr.reduce((acc, cur, index) => acc += `
            <div id="${cur.id}" class="${leadCard} position-${index}">
                <section class="${leadCard}-header">
                    <div class="${leadCard}-company">${cur.company}</div>
                    <div class="${leadCard}-header-actions">
                        <button class="btn-confirm">Confirm</button>
                        <button class="btn-remove">Remove</button>
                        <div class="${leadCard}-time"><span>${getTimeOfAdding()}</span></div>
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
        return '<div>Empty List</div>';
    }

    function confirmButton() {
        $('.btn-confirm').click(function () {
            const currentId = event.currentTarget.parentElement.parentElement.parentElement.id;

            chrome.storage.sync.get(['collection'], function (leads) {
                let newCollection = collectionValidation(leads.collection);
                let confirmElement = {};
                newCollection = newCollection.filter((element) => {
                    if (element.id === currentId) {
                        confirmElement = element;
                    } else {
                        return element;
                    }
                });

                // TODO send the data
                chrome.extension.getBackgroundPage().console.log(confirmElement, 'confirm');
                chrome.storage.sync.set({ "collection": newCollection }, function () {
                    setLeadsListActions(newCollection);
                });
            });
        });
    }

    function removeButton() {
        $('.btn-remove').click(function (event) {
            const currentId = event.currentTarget.parentElement.parentElement.parentElement.id;

            chrome.storage.sync.get(['collection'], function (leads) {
                let newCollection = collectionValidation(leads.collection);
                newCollection = newCollection.filter((element) => element.id !== currentId);

                chrome.storage.sync.set({ "collection": newCollection }, function () {
                    setLeadsListActions(newCollection);
                });
            });
        });
    }

    function createLeadsForm() {
        const customField = 'custom-field';
        const fieldsActionsButtons = 'fields-actions-buttons';
        $('.popup-form').html(`
            <section class="fields-holder">
                <input type="text" id="company" class="${customField}" name="company" placeholder="Company name ...">
                <input type="text" id="email" class="${customField}" name="email" placeholder="Email address">
                <input type="text" id="name" class="${customField}" name="name" placeholder="Name">
                <input type="text" id="notes" class="${customField}" name="notes" placeholder="Notes">
            </section>

            <section class="fields-actions">
                <button class="btn-add ${fieldsActionsButtons}">Add</button>
                <button class="btn-clear ${fieldsActionsButtons}">Clear</button>
            </section>
        `);
    }

    function setLeadsFormActions() {
        $('.custom-field').keyup(delay(function (event) {
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
        }, 200));

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

    function clearFields() {
        chrome.storage.sync.set({ 'fields': {} });
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

function unauthorizedUser() {
    $('.popup-list').html('<div>You are not logged in site</div>');
}