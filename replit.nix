{ pkgs }: {
	deps = [
		pkgs.nodejs-16_x
    pkgs.nodePackages.yarn
    pkgs.nodePackages.typescript-language-server
	];
}