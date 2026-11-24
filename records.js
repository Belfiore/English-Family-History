document.addEventListener('click', function (event) {
    var link = event.target.closest('a.record-link');
    if (!link) return;
    event.preventDefault();
    var image = link.querySelector('img');
    var box = document.createElement('div');
    box.className = 'record-lightbox';
    var big = document.createElement('img');
    big.src = link.getAttribute('href');
    big.alt = image ? image.alt : '';
    var caption = document.createElement('p');
    caption.textContent = image ? image.alt : '';
    box.appendChild(big);
    box.appendChild(caption);
    box.addEventListener('click', function () { box.remove(); });
    document.body.appendChild(box);
});
