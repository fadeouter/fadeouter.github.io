fetch('/nk/urls.md')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.text();
    })
    .then(data => {
        const lines = data.split('\n');
        const mappings = {};

        lines.forEach(line => {
            const [key, url] = line.split(' ');
            if (key && url) {
                mappings[key.trim()] = url.trim();
            }
        });

        const path = window.location.pathname.split('/').filter(Boolean).pop();

        if (path in mappings) {
            window.location.href = mappings[path];
        } else {
            document.body.innerHTML = '<h1>404: Page Not Found</h1>';
        }
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
        document.body.innerHTML = '<h1>Error loading redirection data</h1>';
    });