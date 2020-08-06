chrome.contextMenus.removeAll(function () {
  chrome.contextMenus.create({
    'id': 'sales_crm_saas',
    'title': 'SalesCRM SaaS',
    'contexts': ["selection"]
  });
});

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

    if (markedDataObj.company !== '' ||
      markedDataObj.email !== '' ||
      markedDataObj.name !== '' ||
      markedDataObj.notes !== '') {

      chrome.storage.sync.set({ 'saveFields': markedDataObj }, function () {
        chrome.notifications.create('successfullyAddingMarkedText', {
          type: 'basic',
          iconUrl: '../assets/images/48.png',
          title: 'Successfully adding marked text!',
          message: 'Your marked credentials are added in the form fields.'
        });
      });

    } else {
      chrome.notifications.create('failedAddingMarkedText', {
        type: 'basic',
        iconUrl: '../assets/images/48.png',
        title: 'Failed to add marked text!',
        message: 'Marked credentials are incorrect'
      });
    }
  }
});