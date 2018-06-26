(function () {
  /**
   * Wraps querySelectorAll to return an Array across browsers
   */
  const $ = (el, selector) =>
    Array.prototype.slice.call(el.querySelectorAll(selector), 0);

  // Key codes of key events we want to respond to in the menu
  const keys = {
    tab: 9,
    escape: 27,
    pageup: 33,
    pagedown: 34,
    end: 35,
    home: 36,
    up: 38,
    down: 40
  };

  // Pointers to relevant elements in the DOM
  const menu = document.getElementById('side-nav');
  const mask = document.getElementById('mask');
  const button = document.getElementById('side-nav-btn');
  const buttonImg = button.querySelector('img');

  // Alternative texts for the menu button
  const actionLabels = {
    open: buttonImg.getAttribute('alt'),
    close: buttonImg.getAttribute('data-altclose')
  };

  // The list of links in the menu
  const menuItems = $(menu, 'a');

  // Pointer to the last element that had focus in the main part of the
  // document. Focus will get back to that element when the menu is closed.
  let lastActiveElement = null;

  // Flag set when the side menu is in an open state.
  let isMenuOpened = false;


  /**
   * Handles "keydown" event on individual menu items to navigate the menu
   */
  function handleMenuItemKeydown(evt) {
    if (evt.altKey || evt.ctrlKey ||
        (evt.shiftKey && (evt.keyCode != keys.tab))) {
      return true;
    }

    let focusPosition = menuItems.indexOf(evt.target);
    switch (evt.keyCode) {
      case keys.tab:
        if (evt.shiftKey) {
          focusPosition -= 1;
        }
        else {
          focusPosition += 1;
        }
        break;
      case keys.down:
        focusPosition += 1;
        break;
      case keys.up:
        focusPosition -= 1;
        break;
      case keys.home:
        focusPosition = 0;
        break;
      case keys.end:
        focusPosition = menuItems.length - 1;
        break;
      case keys.pagedown:
        focusPosition += 5;
        break;
      case keys.pageup:
        focusPosition -= 5;
        break;
      default:
        // Ignore other key codes
        return true;
    }

    // Make focus wrap around menu items
    if (focusPosition < 0) {
      focusPosition = menuItems.length - 1;
    }
    if (focusPosition >= menuItems.length) {
      focusPosition = 0;
    }

    // Focus the new menu item and prevent default action
    menuItems[focusPosition].focus();
    evt.stopPropagation();
    evt.preventDefault();
    return false;
  }


  /**
   * For browsers that do something on "keypress" instead of on "keydown",
   * prevent default action if we already reacted on "keydown"
   */
  function handleMenuItemKeypress(evt) {
    if (evt.altKey || evt.ctrlKey ||
        (evt.shiftKey && (evt.keyCode != keys.tab))) {
      return true;
    }
    switch (evt.keyCode) {
      case keys.escape:
      case keys.tab:
      case keys.down:
      case keys.up:
      case keys.home:
      case keys.end:
      case keys.pagedown:
      case keys.pageup:
        evt.stopPropagation();
        evt.preventDefault();
        return false;
      default:
        return true;
    }
  }


  /**
   * Toggle the menu
   */
  function toggleMenu(evt) {
    if (isMenuOpened) {
      mask.className = 'hidden';
      menu.className = 'hidden';
      buttonImg.setAttribute('alt', actionLabels.open);
      menuItems.forEach(item => {
        item.setAttribute('tabindex', '-1');
        item.blur();
      });
      if (lastActiveElement) {
        lastActiveElement.focus();
      }
    }
    else {
      mask.className = 'active';
      menu.className = 'active';
      buttonImg.setAttribute('alt', actionLabels.close);
      lastActiveElement = document.activeElement;
      menuItems.forEach(item => item.setAttribute('tabindex', '0'));
      menuItems[0].focus();
    }
    isMenuOpened = !isMenuOpened;

    evt.preventDefault();
    evt.stopPropagation();
    return false;
  }

  // Render the "open navigation menu" button
  button.hidden = false;

  // Flag the navigation menu as JS-controlled
  menu.setAttribute('data-js', 'true');

  // React to user actions that toggle the menu
  button.addEventListener('click', toggleMenu);
  mask.addEventListener('click', toggleMenu);
  document.addEventListener('keydown', function (evt) {
    if ((evt.key === 'm') || (evt.key === 'M') ||
      (isMenuOpened && (evt.keyCode === keys.escape))) {
      return toggleMenu(evt);
    }
  });

  // React to user navigation in the menu
  menuItems.forEach(item => item.addEventListener('keydown', handleMenuItemKeydown));
  menuItems.forEach(item => item.addEventListener('keypress', handleMenuItemKeypress));
})()
