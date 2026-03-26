import { useContext, useEffect } from "react";
import AuthContext from "@contexts/Auth/AuthContext";
import { getActiveSession } from "@utils/authSession";
import { useHistory } from "react-router-dom";

const useCheckJWT = (id = null) => {
	const { auth, token, logout } = useContext(AuthContext);
	const history = useHistory();
	useEffect(() => {
		const session = getActiveSession();
		if (!id && auth && (!token || session.tokenExpired)) {
			logout();
			history.push("/");
		}
		//eslint-disable-next-line
	}, [token, logout, auth, id, history]);
};

export default useCheckJWT;
