export class Messanger {
	text: string | undefined = $state();

	set(text: string) {
		this.text = text;
	}

	append(text: string) {
		this.text += ((this.text?.length ?? 0) > 0 ? ' ' : '') + text;
	}

	clear() {
		this.text = undefined;
	}
}
