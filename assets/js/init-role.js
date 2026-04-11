(function(){
    var r = localStorage.getItem('brgy14_role');
    if (r) document.documentElement.setAttribute('data-role', r);
    var s = localStorage.getItem('sidebarToggled');
    if (s === 'true') document.documentElement.setAttribute('data-sidebar-toggled', 'true');
})();
