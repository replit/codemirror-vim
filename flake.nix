{
  description = "Dev environment for @replit/codemirror-vim";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.pnpm
          ] ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
            # needed by cm-runtests (selenium)
            pkgs.chromedriver
            pkgs.chromium
          ];
        };
      });
    };
}
