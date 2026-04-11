(function () {
    let debounceTimer;
    const input = document.getElementById('address');
    const list  = document.getElementById('addressSuggestions');

    function closeList() {
        list.innerHTML = '';
        list.style.display = 'none';
    }

    input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const q = this.value.trim();
        if (q.length < 3) { closeList(); return; }

        debounceTimer = setTimeout(async () => {
            try {
                const res  = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=ph&addressdetails=0`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                closeList();
                if (!data.length) return;

                data.forEach(place => {
                    const li = document.createElement('li');
                    li.textContent = place.display_name;
                    li.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:.85rem;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                    li.addEventListener('mouseenter', () => li.style.background = '#eaecf4');
                    li.addEventListener('mouseleave', () => li.style.background = '');
                    li.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        input.value = place.display_name;
                        closeList();
                    });
                    list.appendChild(li);
                });
                list.style.display = 'block';
            } catch (_) { closeList(); }
        }, 350);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== input) closeList();
    });
})();
