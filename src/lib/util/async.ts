type Resolver<T> = (id: string) => Promise<T>;

export async function resolveList<
	TList extends { [P in TProp]: string | TItem },
	TItem,
	TProp extends keyof TList
>(
	list: TList[],
	prop: TProp,
	resolver: Resolver<TItem>
): Promise<(TList & { [P in TProp]: TItem })[]> {
	const promises = list.map((item) => {
		const itemProp = item[prop];
		// Check if itemProp is a string and needs resolving.
		return typeof itemProp === 'string' ? resolver(itemProp) : Promise.resolve(itemProp as TItem);
	});

	const resolvedItems = await Promise.all(promises);
	return list.map((item, index) => ({
		...item,
		[prop]: resolvedItems[index] // Replace identifier with resolved item.
	}));
}
