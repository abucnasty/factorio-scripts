import assert from "../common/assert";

export class MapExtended<K, V> extends Map<K, V> {
    
    constructor(entries?: readonly (readonly [K, V])[] | null) {
        super(entries);
    }

    public getOrThrow(key: K): V {
        const value = this.get(key);
        assert(value !== undefined, `No value found for key ${key}`);
        return value;
    }

    public getOrDefault(key: K, defaultValue: V): V {
        const value = this.get(key);
        if (value === undefined) {
            return defaultValue;
        }
        return value;
    }

    public clone(): MapExtended<K, V> {
        return new MapExtended<K, V>(Array.from(this.entries()));
    }

    public mapValues<T>(f: (value: V, key: K) => T): T[] {
        const result: T[] = [];
        this.forEach((value, key) => {
            result.push(f(value, key));
        });
        return result;
    }

    public map<T>(f: (value: V, key: K) => T): [K, T][] {
        const result: [K, T][] = [];
        this.forEach((value, key) => {
            result.push([key, f(value, key)]);
        });
        return result;
    }

    public values_array(): V[] {
        return Array.from(this.values());
    }

    public entries_array(): [K, V][] {
        return Array.from(this.entries());
    }
}