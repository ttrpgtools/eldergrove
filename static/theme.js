let mode = null;
try {
	mode = window.localStorage.getItem('dark-mode');
} catch {
	/* Use system preference when storage is unavailable. */
}
const isDark = (mode) =>
	mode === 'dark' || (mode == null && window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark', isDark(mode));
window.addEventListener('storage', ({ key, newValue }) => {
	if (key === 'dark-mode') {
		document.documentElement.classList.toggle('dark', isDark(newValue));
	}
});
