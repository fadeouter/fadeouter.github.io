// Fetch the content of the 'urls.md' file
fetch('/nk/urls.md')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.text();
    })
    .then(data => {
        // Parse the content of the file
        const lines = data.split('\n');
        const mappings = {};

        lines.forEach(line => {
            const [key, url] = line.split(' ');
            if (key && url) {
                mappings[key.trim()] = url.trim();
            }
            console.log(key, '123', url)
        });

        // Get the last part of the URL path
        const path = window.location.pathname.split('/').filter(Boolean).pop();
        console.log(path)

        // Check if the path exists in the mappings and redirect
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