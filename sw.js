(function () {
	const CACHE_NAME = 'age-calculator-v1';
	const urlsToCache = [
		'./',
		'./index.html',
		'./app.css',
		'./app.js',
		'./favicon.ico',
		'./manifest.json',
		'https://cdn.tailwindcss.com',
		'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', // fonts
  		'https://www.googletagmanager.com/gtag/js?id=G-92XK2C4QE4', // google tags
	];

	self.addEventListener('install', (event) => {
		event.waitUntil(
			caches.open(CACHE_NAME)
				.then(cache => {
					console.log('Opened cache');
					try {
						return cache.addAll(urlsToCache);
					} catch {
						return Promise.all(urlsToCache.map(function (url) { cache.add(url); }));
					}
				})
		);
	});

	self.addEventListener('fetch', (event) => {
		event.respondWith(
			caches.match(event.request)
				.then(response => {
					if (response) {
						return response; // Serve from cache
					}

					// Determine if request is same-origin
					const requestUrl = new URL(event.request.url);
					const sameOrigin = requestUrl.origin === self.location.origin;

					// If not same-origin, use no-cors mode
					const fetchRequest = sameOrigin
					? event.request
					: new Request(event.request, { mode: 'no-cors' });

					return fetch(fetchRequest);
				})
		);
	});

	// Update a service worker
	self.addEventListener('activate', function (event) {
		const cacheWhitelist = [CACHE_NAME];
		event.waitUntil(
			caches.keys().then(function (cacheNames) {
			return Promise.all(
				cacheNames.map(function (cacheName) {
				if (cacheWhitelist.indexOf(cacheName) === -1) {
					return caches.delete(cacheName);
				}
				})
			);
			})
		);
	});


	// PWA Version Check Logic
	self.addEventListener('message', async (event) => {
		if (event.data && event.data.type === 'CHECK_VERSION') {
			try {
			// Get the cached manifest
			const currentManifestResponse = await caches.match('./manifest.json');
			const currentManifest = currentManifestResponse ? await currentManifestResponse.json() : null;

			// Fetch the latest manifest
			const newManifestRes = await fetch('./manifest.json', { cache: 'no-cache' });
			const newManifest = await newManifestRes.json();

			if (currentManifest && newManifest && currentManifest.version !== newManifest.version) {
				console.log('New PWA version detected. Notifying client.');

				// Notify the page
				event.source.postMessage({ "type": 'UPDATE_AVAILABLE', "version": newManifest.version, "oldVersion": currentManifest.version});

				// Delete all caches
				const cacheNames = await caches.keys();
				await Promise.all(cacheNames.map(name => caches.delete(name)));

				// Optionally, trigger the clients to reload
				const allClients = await self.clients.matchAll({ includeUncontrolled: true });
				allClients.forEach(client => client.postMessage({ type: 'FORCE_RELOAD' }));
			}
			} catch (error) {
			console.error('Failed to check for new version:', error);
			}
		}
	});

})();