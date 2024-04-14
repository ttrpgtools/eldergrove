export class Messanger {
	message: string | undefined = $state();

	set(message: string) {
		this.message = message;
	}

	append(message: string) {
		this.message += ((this.message?.length ?? 0) > 0 ? ' ' : '') + message;
	}

	clear() {
		this.message = undefined;
	}
}
