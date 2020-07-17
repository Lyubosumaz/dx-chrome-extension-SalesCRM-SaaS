let contextMenu = {
  'id': 'sales_crm_saas',
  'title': 'SalesCRM SaaS',
  'contexts': ["selection"]
};

chrome.contextMenus.create(contextMenu);

chrome.contextMenus.onClicked.addListener(function (clickData) {
  if (clickData.menuItemId === 'sales_crm_saas' && clickData.selectionText) {
    const markedText = clickData.selectionText.split(', ').map(element => element.split(': '));
    let markedDataObj = { company: '', email: '', name: '', notes: '', };
    for (const [key, value] of markedText) {
      if (key.toLowerCase().includes('company')) { markedDataObj.company = value; }
      if (key.toLowerCase().includes('email')) { markedDataObj.email = value; }
      if (key.toLowerCase().includes('name')) { markedDataObj.name = value; }
      if (key.toLowerCase().includes('notes')) { markedDataObj.notes = value; }
    }

    chrome.storage.sync.set({ 'saveFields': markedDataObj }, function () {
      let notificationOptions = {
        type: 'basic',
        iconUrl: './assets/images/48.png',
        title: 'Successfully Added Your Marked Text!',
        message: 'Your marked credentials are added to on the form fields.'
      };

      chrome.notifications.create('successfullyAddedMarkedText', notificationOptions);
    });
  }
});