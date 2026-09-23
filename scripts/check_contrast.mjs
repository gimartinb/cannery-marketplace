function luminance(hex) {
  const values = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const rgb = values.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function ratio(foreground, background) {
  const [bright, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (bright + 0.05) / (dark + 0.05);
}
for (const color of ["#a87816", "#8a6110", "#7d570d", "#73500c"]) {
  console.log(color, ratio(color, "#fffdf8").toFixed(2), ratio(color, "#f8f4eb").toFixed(2));
}
