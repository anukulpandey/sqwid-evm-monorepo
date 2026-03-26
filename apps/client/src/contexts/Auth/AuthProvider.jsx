import constants from "@utils/constants";
import {
	SESSION_CLEARED_EVENT,
	getActiveSession,
} from "@utils/authSession";
import React, { useEffect, useReducer, useState } from "react";
import AuthContext from "./AuthContext";
import { initialState } from "./initialState";
import { reducer } from "./reducer";

const AuthProvider = props => {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [loading, setLoading] = useState(false);

	const clearAuthState = () => {
		localStorage.removeItem("tokens");
		localStorage.removeItem("auth");
		localStorage.removeItem(`${constants.APP_NAME.toLowerCase()}__balance`);
		dispatch({
			type: "LOGOUT",
		});
	};

	const login = authData => {
		dispatch({
			type: "LOGIN",
			payload: authData,
		});
		localStorage.setItem("auth", JSON.stringify(authData));
	};

	const logout = () => {
		clearAuthState();
	};

	useEffect(() => {
		const handleSessionCleared = () => {
			dispatch({
				type: "LOGOUT",
			});
		};

		window.addEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
		return () => {
			window.removeEventListener(
				SESSION_CLEARED_EVENT,
				handleSessionCleared
			);
		};
	}, []);

	useEffect(() => {
		const injectedProvider =
			typeof window !== "undefined" ? window.ethereum : null;
		const activeAddress = state.auth?.evmAddress || state.auth?.address || null;

		if (!injectedProvider?.on || !activeAddress) {
			return undefined;
		}

		const handleAccountsChanged = accounts => {
			const nextAddress = accounts?.[0] || null;
			if (
				!nextAddress ||
				nextAddress.toLowerCase() !== activeAddress.toLowerCase()
			) {
				clearAuthState();
			}
		};

		const handleChainChanged = () => {
			clearAuthState();
		};

		injectedProvider.on("accountsChanged", handleAccountsChanged);
		injectedProvider.on("chainChanged", handleChainChanged);

		return () => {
			if (injectedProvider.removeListener) {
				injectedProvider.removeListener(
					"accountsChanged",
					handleAccountsChanged
				);
				injectedProvider.removeListener(
					"chainChanged",
					handleChainChanged
				);
			}
		};
	}, [state.auth]);

	return (
		<AuthContext.Provider
			value={{
				auth: state.auth,
				token: state.token || getActiveSession().token || null,
				loading: loading,
				login,
				logout,
				setLoading,
			}}
		>
			{props.children}
		</AuthContext.Provider>
	);
};

export default AuthProvider;
