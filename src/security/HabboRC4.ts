export class HabboRC4 {
    private i: number = 0;
    private j: number = 0;
    private readonly table: number[] = new Array(256);

    constructor(key: Uint8Array) {
        const length = key.length;

        // Initialize table with values 0-255
        while (this.i < 256) {
            this.table[this.i] = this.i;
            this.i++;
        }

        this.i = 0;
        this.j = 0;

        // Mix the key into the table
        while (this.i < 256) {
            this.j = ((this.j + this.table[this.i]) + (key[this.i % length] & 0xff)) % 256;
            this.swap(this.i, this.j);
            this.i++;
        }

        this.i = 0;
        this.j = 0;
    }

    private swap(a: number, b: number): void {
        const num = this.table[a];
        this.table[a] = this.table[b];
        this.table[b] = num;
    }

    /**
     * Parse and encrypt/decrypt bytes with RC4
     * @param bytes The bytes to parse
     */
    public parse(bytes: Uint8Array): void {
        for (let index = 0; index < bytes.length; index++) {
            this.i = (this.i + 1) % 256;
            this.j = (this.j + this.table[this.i]) % 256;
            this.swap(this.i, this.j);

            bytes[index] = (bytes[index] & 0xFF) ^ this.table[(this.table[this.i] + this.table[this.j]) % 256];
        }
    }
}