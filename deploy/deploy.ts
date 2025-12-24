import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPrivacyVault = await deploy("PrivacyVault", {
    from: deployer,
    log: true,
  });

  console.log(`PrivacyVault contract: `, deployedPrivacyVault.address);
};
export default func;
func.id = "deploy_privacy_vault"; // id required to prevent reexecution
func.tags = ["PrivacyVault"];
