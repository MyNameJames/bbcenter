/* Login page — toggle password visibility */
(function () {
    'use strict';

    var toggle = document.querySelector('.login-toggle');
    if (!toggle) return;

    var input  = document.getElementById('password');
    var eye     = toggle.querySelector('.icon-eye');
    var eyeOff = toggle.querySelector('.icon-eye-off');

    toggle.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        eye.style.display     = show ? 'none' : '';
        eyeOff.style.display = show ? '' : 'none';
    });
})();
