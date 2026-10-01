export class Messanger {
	text: string | undefined = $state();
	exclusive = $state(false);

	set(text: string, exclusive = false) {
		this.text = text;
		this.exclusive = exclusive;
	}

	append(text: string) {
		this.text = [this.text, text.trim()].filter(Boolean).join(' ');
	}

	clear() {
		this.text = undefined;
		this.exclusive = false;
	}
}
