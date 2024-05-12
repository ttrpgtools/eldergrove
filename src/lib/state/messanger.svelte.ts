export class Messanger {
	text: string | undefined = $state();
	exclusive = $state(false);

	set(text: string, exclusive = false) {
		this.text = text;
		this.exclusive = exclusive;
	}

	append(text: string) {
		this.text += ((this.text?.length ?? 0) > 0 ? ' ' : '') + text;
	}

	clear() {
		this.text = undefined;
	}
}
