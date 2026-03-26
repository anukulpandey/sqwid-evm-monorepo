import { respondTo } from "@styles/styledMediaQuery";
// import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
// import RecentlyListed from "./RecentlyListed";
import { fetchCollectionsByStats } from "@utils/marketplace";
// import OnSaleSection from "@elements/Explore/Sections/OnSaleSection";
// import AuctionSection from "@elements/Explore/Sections/AuctionSection";
// import RaffleSection from "@elements/Explore/Sections/RaffleSection";
// import LoansSection from "@elements/Explore/Sections/LoansSection";
import TopCollectionsSection from "@elements/Explore/Sections/TopCollectionsSection";
import useOnScreen from "@utils/useOnScreen";

// changed the min height ot 20 instead of 70 to stop the quirky thing
const Container = styled.div`
	padding: 0 6rem;
	min-height: 20vh;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	${respondTo.md`
		padding: 0;
		h1{
			padding-left: 3rem;
		}
	`}
`;

const Wrapper = styled.div`
	padding: 0 12rem;
	${respondTo.md`
		padding: 0;
	`}
`;

const Section = styled.section`
	width: 100%;
	margin: 4rem 0;
`;
const EmptySectionText = styled.h2`
	font-weight: 900;
	color: var(--app-container-text-primary);
	text-align: center;
	font-size: 1.25rem;
`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const Explore = () => {
	const [isLoading, setIsLoading] = useState(true);
	// const [onSale, setOnSale] = useState([]);
	// const [auctions, setAuctions] = useState([]);
	// const [raffles, setRaffles] = useState([]);
	// const [loans, setLoans] = useState([]);
	const [collections, setCollections] = useState([]);
	const containerRef = useRef();
	const { isVisible } = useOnScreen(containerRef);

	const fetchData = async () => {
		// console.log("sending request")
		// const { sale, auction, raffle, loan } = await fetchMarketplaceItems();
		// setOnSale(sale);
		// setAuctions(auction);
		// setRaffles(raffle);
		// setLoans(loan);
		const response = await fetchCollectionsByStats("latest", Infinity, null, "desc", 10);
		const rawCollections = response.collections || [];
		const nonDefaultCollections = rawCollections.filter(
			collection => collection?.owner?.toLowerCase() !== ZERO_ADDRESS
		);
		setCollections(
			(nonDefaultCollections.length ? nonDefaultCollections : rawCollections).slice(0, 10)
		);
		setIsLoading(false);
	};

	useEffect(() => {
		isVisible && collections.length === 0 && fetchData();
		//eslint-disable-next-line
	}, [isVisible]);

	return (
		<Section id="explore">
			<Wrapper>
				<Container id="explore" ref={containerRef}>
					{!isLoading && (
						<>
							{
								collections.length ? (
									<TopCollectionsSection items={collections} />
								) : (
									<EmptySectionText>No collections have been created yet.</EmptySectionText>
								)
							}
							{/* <OnSaleSection items={onSale} />
							<AuctionSection items={auctions} />
							<RaffleSection items={raffles} />
							<LoansSection items={loans} /> */}
						</>
					)}
				</Container>
			</Wrapper>
		</Section>
	);
};

export default Explore;
