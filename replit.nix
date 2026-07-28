{ pkgs }: {
	deps = [
		pkgs.nodejs_20
    pkgs.nodePackages.pnpm
    pkgs.nodePackages.typescript-language-server
    pkgs.chromedriver
    pkgs.chromium
	];
}