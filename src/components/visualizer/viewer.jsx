import React from 'react';
import '../viewer.css';

import GremlinResponseSerializers from './gremlin-serializer';
import GraphCanvas from './canvas';
import CanvasStatsCanvas, {CopyRightInfo, NotificationDiv, ConnectionStatus} from "./util-components";
import {SelectedDataCanvas} from "./selected-data";
import {LegendCanvas} from "./legend";
import ErrorBoundary from "./error-boundary";
import GremlinConnectorViewBase from "../core/gremlin-connector";


export default class GraphViewer extends GremlinConnectorViewBase {

    gremlin_serializer = new GremlinResponseSerializers();
    isDataChanged = true;


    constructor() {
        // This component can load
        super();
        this.state = {
            "nodes": [],
            "links": [],
            "showProperties": false,
            "selectedData": {},
            "labelsConfig": null
        };
    }

    getLabelsConfigFromStorage() {
        // labels
        this.setState({
            "labelsConfig": ""
        })
    }

    get_LINK_ID_TO_LINK(edges) {
        // TODO - revist the name
        let data = {};
        edges.forEach(edge => {
            data[edge.id] = edge;
        });
        return data;
    }

    get_NODE_ID_TO_LINK_IDS(edges) {
        // TODO - revist the name
        let data = {};
        edges.forEach(edge => {
            data[edge.source.id || edge.source] = data[edge.source.id || edge.source] || new Set();
            data[edge.target.id || edge.target] = data[edge.target.id || edge.target] || new Set();
            data[edge.source.id || edge.source].add(edge.id);
            data[edge.target.id || edge.target].add(edge.id);
        });
        return data;
    }


    processGremlinResponseEvent(event) {
        let _this = this;
        let response = JSON.parse(event.data);

        console.log("onmessage received", response);

        if (response.status.code === 200 || response.status.code === 206) {
            _this.updateStatusMessage("Query Successfully Responded.");
            _this.setState({
                "errorMessage": null
            })
            let result = _this.gremlin_serializer.process(response);
            let _ = _this.gremlin_serializer.seperate_vertices_and_edges(result);

            console.log("==================query response ", _.nodes.length, _.links.length);
            _this.isDataChanged = true;

            if (this.state.freshQuery === false) {
                // extend the graph if this is not fresh query.

                const existingNodes = _this.state.nodes;
                const existingLinks = _this.state.links;

                let overallNodes = _.nodes.concat(existingNodes);
                let overallLinks = _.links.concat(existingLinks);

                const uniqueNodes = [...new Map(overallNodes.map(item => [item.id, item])).values()];
                const uniqueLinks = [...new Map(overallLinks.map(item => [item.id, item])).values()];


                _this.setState({
                    nodes: uniqueNodes,
                    links: uniqueLinks,
                    NODE_ID_TO_LINK_IDS: this.get_NODE_ID_TO_LINK_IDS(uniqueLinks),
                    LINK_ID_TO_LINK: this.get_LINK_ID_TO_LINK(uniqueLinks)
                });

            } else {
                // use the data from current query only as this is a fresh query.
                let existingNodes = _.nodes;
                let existingLinks = _.links;

                _this.setState({
                    nodes: existingNodes,
                    links: existingLinks,
                    NODE_ID_TO_LINK_IDS: this.get_NODE_ID_TO_LINK_IDS(existingLinks),
                    LINK_ID_TO_LINK: this.get_LINK_ID_TO_LINK(existingLinks)
                });

            }


        } else {

            _this.setState({
                "errorMessage": JSON.stringify(response,),
                "showErrorMessage": true,
                "statusMessage": "Query Successfully Responded." +
                    " But returned non 200 status[" + response.status.code + "]"
            })
        }


    }


    componentDidUpdate(prevProps) {
        this.isDataChanged = false;
    }

    updateQueryInput(query) {
        document.querySelector('input').value = query;
    }


    componentDidMount() {

        this.setupGremlinServer()
        this.onPageLoadInitQuery()
        this.getLabelsConfigFromStorage();
    }

    onFormSubmit(e) {
        e.preventDefault();
        let queryId = "mainQuery";
        let query = e.target.query.value;
        if (query && this.ws) {
            this.queryGremlinServer(query, true, queryId,);
        }
    }


    setSelectedData(data) {
        this.setState({...data})
    }


    render() {

        console.log("=================== Rendering the Viewer ===================");
        console.log("======= viewer this.state", this.state.nodes.length, this.state.links.length);


        return (
            <div>
                <div className="search-div">
                    <form className={"viewer-form "} action="" onSubmit={this.onFormSubmit.bind(this)}>
                        <input type="text" name="query" placeholder="g.V().limit(5)"/>
                    </form>
                </div>
                <ErrorBoundary>

                    <GraphCanvas
                        nodes={this.state.nodes}
                        links={this.state.links}
                        NODE_ID_TO_LINK_IDS={this.state.NODE_ID_TO_LINK_IDS}
                        LINK_ID_TO_LINK={this.state.LINK_ID_TO_LINK}
                        queryGremlinServer={this.queryGremlinServer.bind(this)}
                        setSelectedData={this.setSelectedData.bind(this)}
                        isDataChanged={this.isDataChanged}
                    />
                </ErrorBoundary>

                <CanvasStatsCanvas nodes_count={this.state.nodes.length} links_count={this.state.links.length}/>
                <SelectedDataCanvas selectedData={this.state.selectedData} showProperties={this.state.showProperties}/>
                <LegendCanvas nodes={this.state.nodes} links={this.state.links}/>

                <NotificationDiv/>
                <ConnectionStatus
                    statusMessage={this.state.statusMessage}
                    isConnected2Server={this.state.isConnected2Server}
                    showErrorMessage={this.state.showErrorMessage}
                    errorMessage={this.state.errorMessage}
                    closeErrorMessage={this.closeErrorMessage.bind(this)}
                />
                <CopyRightInfo/>

            </div>
        )
    }
};