import CollectibleContext from "@contexts/Collectible/CollectibleContext";
import InfoContent from "@elements/Collectible/InfoContent";
import NFTContent from "@elements/Collectible/NFTContent";
import LoadingIcon from "@static/svg/LoadingIcon";
import { respondTo } from "@styles/styledMediaQuery";
import constants from "@utils/constants";

import {
	//eslint-disable-next-line
	fetchMarketplaceItem,
	//eslint-disable-next-line
	fetchRaffleEntries,
	//eslint-disable-next-line
	marketplaceItemExists,
} from "@utils/marketplace";
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router";
import styled from "styled-components";
import { getBackend } from "@utils/network";
import useStateInfo from "@utils/useStateInfo";
import { useErrorModalHelper } from "@elements/Default/ErrorModal";
import { convertREEFtoUSD } from "@utils/convertREEFtoUSD";
import { initialState as collectibleInitialState } from "@contexts/Collectible/initialState";

const Wrapper = styled.div`
	padding: 0 6rem;
	height: calc(100vh - 12rem);
	/* display: flex; */
	display: grid;
	grid-auto-columns: minmax(0, 1fr);
	grid-auto-flow: column;
	/* grid-template-columns: repeat(2,minmax(0,1fr)); */
	gap: 2rem;
	${respondTo.md`
		padding: 0 2rem;
		grid-auto-flow: row;
		min-height: 85vh;
		height: auto;
	`}
`;

const LoadingContainer = styled.div`
	height: 70vh;
	width: 100%;
	display: grid;
	place-items: center;
`;

const normalizeCollectiblePayload = payload => ({
	...collectibleInitialState,
	...payload,
	hearts: Array.isArray(payload?.hearts) ? payload.hearts : [],
	collection: {
		...collectibleInitialState.collection,
		...(payload?.collection || {}),
	},
	creator: {
		...collectibleInitialState.creator,
		...(payload?.creator || {}),
	},
	owner: {
		...collectibleInitialState.owner,
		...(payload?.owner || {}),
	},
	meta: {
		...collectibleInitialState.meta,
		...(payload?.meta || {}),
		attributes: Array.isArray(payload?.meta?.attributes)
			? payload.meta.attributes
			: [],
	},
});

const MetaTags = () => {
	const { collectibleInfo } = useContext(CollectibleContext);
	// console.log(collectibleInfo)
	const stateInfo = useStateInfo();
	const emoji = stateInfo ? constants.STATE_EMOJI_MAP[stateInfo?.type] : null;
	const name = collectibleInfo?.meta?.name || `Collectible #${collectibleInfo?.positionId || ""}`.trim();
	const description = collectibleInfo?.meta?.description || "View this collectible on Sqwid.";
	const image = collectibleInfo?.meta?.image || collectibleInfo?.meta?.media || "";
	const title = `${emoji ? `${emoji} | ` : ""}${
		name
	} | ${constants.APP_NAME}`;
	return (
		<Helmet>
			<title>{title}</title>
			<meta name="title" content={title} />
			<meta name="description" content={description} />

			<meta property="og:type" content="website" />
			<meta property="og:url" content={constants.APP_WEBSITE} />
			<meta property="og:title" content={title} />
			<meta property="og:description" content={description} />
			<meta property="og:image" content={image} />

			<meta property="twitter:card" content="summary_large_image" />
			<meta property="twitter:url" content={constants.APP_WEBSITE} />
			<meta property="twitter:title" content={title} />
			<meta property="twitter:description" content={description} />
			<meta property="twitter:image" content={image} />
		</Helmet>
	);
};

const HeroSection = () => {
	const { collectibleInfo, setCollectibleInfo } =
		useContext(CollectibleContext);
	const [isLoading, setIsLoading] = useState(true);
	const { addr } = useParams();
	const { showErrorModal } = useErrorModalHelper();

	useEffect(() => {
		let ignore = false;
		const getData = async () => {
			try {
				const collectible = await axios.get(
					`${getBackend()}/get/marketplace/position/${addr}`
				);

				if (ignore) {
					return;
				}

				if (
					!collectible.data ||
					collectible.data.error ||
					!collectible.data.positionId
				)
					setCollectibleInfo({
						...collectibleInfo,
						isValidCollectible: false,
					});
				else {
					setCollectibleInfo(
						normalizeCollectiblePayload({
							...collectible.data,
							conversionRate: 0,
							isValidCollectible: true,
						})
					);
					setIsLoading(false);
					convertREEFtoUSD(1).then(conversionRate => {
						if (!ignore) {
							setCollectibleInfo(current => ({
								...current,
								conversionRate: Number(conversionRate) || 0,
							}));
						}
					});
				}
			} catch (err) {
				if (ignore) {
					return;
				}
				showErrorModal(err);
				setCollectibleInfo({
					...collectibleInfo,
					isValidCollectible: false,
				});
			}
		};
		getData();
		return () => {
			ignore = true;
		};
		//eslint-disable-next-line
	}, []);
	return (
		<>
			{isLoading ? (
				<LoadingContainer>
					<LoadingIcon size={64} />
				</LoadingContainer>
			) : (
				<Wrapper>
					<MetaTags />
					<InfoContent />
					<NFTContent />
				</Wrapper>
			)}
		</>
	);
};

export default HeroSection;
