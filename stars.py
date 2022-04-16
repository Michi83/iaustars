# Extracs data from the Bright Star Catalog.

colors = {
    "O": "#0000FF",
    "B": "#8080FF",
    "A": "#FFFFFF",
    "F": "#FFFF80",
    "G": "#FFFF00",
    "K": "#FF8000",
    "M": "#FF0000",
}

print("let stars = [")
with open("bsc5.dat") as file:
    for line in file:
        try:
            number = int(line[0:4])
            ra_h = int(line[75:77])
            ra_m = int(line[77:79])
            ra_s = float(line[79:83])
            right_ascension = ra_h + ra_m / 60 + ra_s / 3600
            dec_sign = 1 if line[83:84] == "+" else -1
            dec_d = int(line[84:86])
            dec_m = int(line[86:88])
            dec_s = int(line[88:90])
            declination = dec_sign * (dec_d + dec_m / 60 + dec_s / 3600)
            magnitude = float(line[102:107])
            try:
                color = colors[line[129:130]]
            except KeyError:
                color = "#808080"
            print("    {")
            print("        number: %i," % number)
            print("        rightAscension: %f," % right_ascension)
            print("        declination: %f," % declination)
            print("        magnitude: %f," % magnitude)
            print("        color: \"%s\"" % color)
            print("    },")
        except:
            pass
print("]")
