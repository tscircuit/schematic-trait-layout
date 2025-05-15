import { chip } from "lib/builder";
//          +----+
// +--------|    |---L
// |        |    |
// B     ---|    |---L
// |     |  +----+
// +     L
// L

export default () => {
	const C = chip().leftpins(2).rightpins(2);
	C.pin(1).line(-3, 0).line(0, -1).passive("vertical").line(0, -1).label();
	C.pin(2).line(-1, 0).line(0, -1).label();
	C.pin(3).line(1, 0).label();
	C.pin(4).line(1, 0).label();

	return C;
};
