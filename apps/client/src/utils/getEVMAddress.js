import { ethers } from "ethers";

const getEVMAddress = async address => ethers.utils.getAddress(address);

export default getEVMAddress;
